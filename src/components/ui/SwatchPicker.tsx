import React from "react";
import { View, Pressable } from "react-native";
import { Icon } from "./Icon";

type Swatch = { key: string; color: string };

type Props = {
  swatches: Swatch[];
  selected?: string;
  onSelect: (key: string) => void;
  size?: number;
};

export function SwatchPicker({ swatches, selected, onSelect, size = 34 }: Props) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {swatches.map((s) => {
        const active = s.key === selected;
        return (
          <Pressable key={s.key} onPress={() => onSelect(s.key)}>
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: s.color,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 2.5 : 0,
                borderColor: "#FFFFFF",
                shadowColor: "#000",
                shadowOpacity: active ? 0.25 : 0,
                shadowRadius: 4,
              }}
            >
              {active ? <Icon name="check" size={size * 0.45} color="#0B0D12" /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
