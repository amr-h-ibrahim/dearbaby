import React from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { GLOBAL_NON_SERIALIZABLE_PARAMS_VALUES } from "./useNavigation";

const useParams = () => {
  const serializableParams = useLocalSearchParams();

  // Get it once and memoize, the same global object will be cleared
  // on each navigation event, and it can only be guaranteed to have this
  // screen's params once
  const nonSerializableParams = React.useMemo(() => {
    return { ...GLOBAL_NON_SERIALIZABLE_PARAMS_VALUES };
  }, []);

  return { ...serializableParams, ...nonSerializableParams };
};

export default useParams;
