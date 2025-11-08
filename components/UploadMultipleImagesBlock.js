import React from "react";
import { ExpoImage, SimpleStyleFlatList, withTheme } from "@draftbit/ui";
import { View } from "react-native";
import * as GlobalStyles from "../GlobalStyles.js";
import palettes from "../themes/palettes";
import Breakpoints from "../utils/Breakpoints";
import * as StyleSheet from "../utils/StyleSheet";
import imageSource from "../utils/imageSource";
import useNavigation from "../utils/useNavigation";
import useWindowDimensions from "../utils/useWindowDimensions";

const defaultProps = { Name: "" };

const UploadMultipleImagesBlock = (props) => {
  const { theme } = props;
  const dimensions = useWindowDimensions();
  const [Multiple_Images, setMultiple_Images] = React.useState([]);

  return (
    <View style={StyleSheet.applyWidth({ position: "relative" }, dimensions.width)}>
      <SimpleStyleFlatList
        data={Multiple_Images}
        decelerationRate={"normal"}
        horizontal={false}
        inverted={false}
        keyExtractor={(listData, index) =>
          listData?.id ?? listData?.uuid ?? index?.toString() ?? JSON.stringify(listData)
        }
        keyboardShouldPersistTaps={"never"}
        listKey={"List"}
        nestedScrollEnabled={false}
        numColumns={1}
        onEndReachedThreshold={0.5}
        pagingEnabled={false}
        renderItem={({ item, index }) => {
          const listData = item;
          return (
            <ExpoImage
              allowDownscaling={true}
              cachePolicy={"disk"}
              transitionDuration={300}
              transitionEffect={"cross-dissolve"}
              transitionTiming={"ease-in-out"}
              {...GlobalStyles.ExpoImageStyles(theme)["Image (default)"].props}
              contentPosition={"center"}
              resizeMode={"center"}
              source={imageSource(`${listData}`)}
              style={StyleSheet.applyWidth(
                StyleSheet.compose(GlobalStyles.ExpoImageStyles(theme)["Image (default)"].style, {
                  position: "relative",
                }),
                dimensions.width,
              )}
            />
          );
        }}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        snapToAlignment={"start"}
        style={StyleSheet.applyWidth({ position: "relative" }, dimensions.width)}
      />
    </View>
  );
};

export default withTheme(UploadMultipleImagesBlock);
