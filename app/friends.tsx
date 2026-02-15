/**
 * Redirect /friends to Friends & Bonds tab.
 * Friends content now lives in (tabs)/bonds with Friends | Bonds sub-tabs.
 */
import { Redirect } from "expo-router";

export default function FriendsRedirect() {
  return <Redirect href="/(tabs)/bonds" />;
}
