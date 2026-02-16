/** Expo config with env-based RevenueCat keys. */
const original = require("./app.json");

module.exports = {
  ...original,
  expo: {
    ...original.expo,
    plugins: [
      ...original.expo.plugins,
      [
        "react-native-purchases",
        {
          iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || "",
          androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || "",
        },
      ],
    ],
  },
};
