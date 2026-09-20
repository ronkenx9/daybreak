import { useRef, type ReactNode } from "react";
import {
  Animated,
  Platform,
  Pressable,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  selected?: boolean;
  fill?: boolean;
  reduceMotion: boolean;
};

/** Press feedback stays attached to the acted-on surface. */
export function MotionPressable({ children, onPress, style, accessibilityLabel, accessibilityRole = "button", selected, fill = false, reduceMotion }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => {
    if (reduceMotion) return;
    Animated.timing(scale, { toValue, duration: toValue === 1 ? 180 : 90, useNativeDriver: Platform.OS !== "web" }).start();
  };
  return <Pressable style={fill ? { flex: 1 } : undefined} onPress={onPress} onPressIn={() => animate(0.975)} onPressOut={() => animate(1)} accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} accessibilityState={selected === undefined ? undefined : { selected }}>
    <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
  </Pressable>;
}
