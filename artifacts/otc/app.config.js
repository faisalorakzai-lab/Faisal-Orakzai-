module.exports = {
  expo: {
    name: "OTC Super App",
    slug: "otc",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "otc",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: { supportsTablet: false },
    android: {},
    web: { favicon: "./assets/images/icon.png" },
    plugins: [
      [
        "expo-router",
        { origin: "https://replit.com/" },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
      mapboxToken: process.env.MAPBOX_TOKEN ?? "",
      ablyApiKey: process.env.ABLY_API_KEY ?? "",
      geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    },
  },
};
