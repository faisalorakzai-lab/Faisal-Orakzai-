import Constants from "expo-constants";
import Ably from "ably";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const ABLY_API_KEY: string = extra.ablyApiKey ?? "";

let _client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime | null {
  if (!ABLY_API_KEY) return null;
  if (!_client) {
    _client = new Ably.Realtime({
      key: ABLY_API_KEY,
      autoConnect: true,
    });
  }
  return _client;
}

export function closeAblyClient(): void {
  if (_client) {
    _client.close();
    _client = null;
  }
}
