import React from "react";
import { useRouter, useNavigation as useDefaultNavigation } from "expo-router";

export let GLOBAL_NON_SERIALIZABLE_PARAMS_VALUES = {};

const splitRouteAndParams = (currentRoute, params = {}) => {
  if (!params.screen) {
    return { route: currentRoute, params };
  }

  const newRoute = currentRoute + "/" + params.screen;
  if (params.params) {
    return splitRouteAndParams(newRoute, params.params);
  }

  return { route: newRoute, params: {} };
};

const splitSerializableAndNonSerializableParams = (params) => {
  const serializable = {};
  const nonSerializable = {};
  const serializableTypes = ["string", "number", "boolean"];

  Object.keys(params).forEach((key) => {
    if (serializableTypes.includes(typeof params[key])) {
      serializable[key] = params[key];
    } else {
      nonSerializable[key] = params[key];
    }
  });

  return { serializable, nonSerializable };
};

const prepareForNavigation = (route, params = {}) => {
  GLOBAL_NON_SERIALIZABLE_PARAMS_VALUES = {};
  const { route: newRoute, params: newParams } = splitRouteAndParams(route, params);
  const { serializable, nonSerializable } = splitSerializableAndNonSerializableParams(newParams);

  Object.keys(nonSerializable).forEach((key) => {
    GLOBAL_NON_SERIALIZABLE_PARAMS_VALUES[key] = nonSerializable[key];
  });

  return { route: newRoute, params: serializable };
};

const useNavigation = () => {
  const router = useRouter();
  const defaultNavigation = useDefaultNavigation();

  const navigate = (route, params) => {
    const { route: newRoute, params: newParams } = prepareForNavigation(route, params);
    router.navigate({ pathname: newRoute, params: newParams });
  };

  const replace = (route, params) => {
    const { route: newRoute, params: newParams } = prepareForNavigation(route, params);
    router.replace({ pathname: newRoute, params: newParams });
  };

  const push = (route, params) => {
    const { route: newRoute, params: newParams } = prepareForNavigation(route, params);
    router.push({ pathname: newRoute, params: newParams });
  };

  const goBack = () => {
    router.back();
  };

  return { ...defaultNavigation, navigate, replace, push, goBack };
};

export default useNavigation;
