import * as GlobalVariables from "../config/GlobalVariableContext";

const resolveConstants = () => {
  if (typeof globalThis !== "undefined" && globalThis.__draftbitGlobalValues) {
    return globalThis.__draftbitGlobalValues;
  }
  return GlobalVariables.AppVariables || {};
};

const trimTrailingSlash = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\/+$/, "");
};

const resolveAuthHeader = (constants) => {
  const fromHeader =
    typeof constants?.AUTHORIZATION_HEADER === "string"
      ? constants.AUTHORIZATION_HEADER.trim()
      : "";
  if (fromHeader) {
    return fromHeader;
  }
  const token = typeof constants?.auth_token === "string" ? constants.auth_token.trim() : "";
  if (!token) {
    return "";
  }
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
};

const resolveAnonKey = (constants) => {
  const anonKey =
    typeof constants?.SUPABASE_ANON_KEY === "string" ? constants.SUPABASE_ANON_KEY.trim() : "";
  if (anonKey) {
    return anonKey;
  }
  const apiKey = typeof constants?.apiKey === "string" ? constants.apiKey.trim() : "";
  return apiKey;
};

const CONTENT_PROFILE_FALLBACK = "dearbaby";

class SupabaseQueryBuilder {
  constructor(table) {
    this.table = table;
    this._select = "*";
    this._filters = [];
  }

  select(columns = "*") {
    this._select = columns || "*";
    return this;
  }

  eq(column, value) {
    this._filters.push([column, value]);
    return this;
  }

  async single() {
    return this._execute({ single: true });
  }

  async _execute({ single = false } = {}) {
    const constants = resolveConstants();
    const supabaseUrl = trimTrailingSlash(constants?.SUPABASE_URL);
    const anonKey = resolveAnonKey(constants);
    const authorization = resolveAuthHeader(constants);
    const contentProfile =
      typeof constants?.["Content-Profile"] === "string" &&
      constants["Content-Profile"].trim().length > 0
        ? constants["Content-Profile"].trim()
        : CONTENT_PROFILE_FALLBACK;

    if (!supabaseUrl || !anonKey || !authorization) {
      const error = new Error("supabase_client_not_configured");
      error.status = 0;
      return { data: null, error };
    }

    const params = new URLSearchParams();
    params.set("select", this._select || "*");
    this._filters.forEach(([column, value]) => {
      const filterValue = value === undefined || value === null ? "" : String(value);
      params.append(column, `eq.${filterValue}`);
    });

    const requestUrl = `${supabaseUrl}/rest/v1/${this.table}?${params.toString()}`;
    const headers = {
      Accept: "application/json",
      apikey: anonKey,
      Authorization: authorization,
      "Content-Profile": contentProfile,
      "Accept-Profile": contentProfile,
    };

    const response = await fetch(requestUrl, {
      method: "GET",
      headers,
    });

    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (parseError) {
      const error = new Error("supabase_invalid_json");
      error.status = response.status;
      error.payload = text;
      return { data: null, error };
    }

    if (!response.ok) {
      const error = new Error("supabase_request_failed");
      error.status = response.status;
      error.payload = json;
      return { data: null, error };
    }

    if (single) {
      if (Array.isArray(json)) {
        if (!json.length) {
          const error = new Error("supabase_row_not_found");
          error.status = 406;
          return { data: null, error };
        }
        return { data: json[0], error: null };
      }
      if (json === null) {
        const error = new Error("supabase_row_not_found");
        error.status = 406;
        return { data: null, error };
      }
      return { data: json, error: null };
    }

    return { data: json, error: null };
  }
}

const SupabaseClient = {
  from(table) {
    if (!table || typeof table !== "string") {
      throw new Error("table_name_required");
    }
    return new SupabaseQueryBuilder(table);
  },
};

export default SupabaseClient;
