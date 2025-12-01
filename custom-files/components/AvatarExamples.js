import React from "react";
import { Text, View } from "react-native";
import Avatar from "./Avatar";

export default function AvatarExamples() {
  const mintViewFn = React.useCallback(async (objectKey) => {
    const seed = `${objectKey}-${Date.now()}`;
    return {
      url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/200`,
    };
  }, []);

  return (
    <View style={{ padding: 16, alignItems: "center" }}>
      <Text style={{ fontWeight: "600", marginBottom: 8 }}>{"Parent Avatar (direct URL)"}</Text>
      <Avatar uri="https://i.pravatar.cc/200?img=13" size={96} style={{ marginBottom: 24 }} />
      <Text style={{ fontWeight: "600" }}>{"Baby Avatar (focus refresh with mintViewFn)"}</Text>
      <Avatar objectKey="baby-demo" mintViewFn={mintViewFn} size={120} />
    </View>
  );
}
