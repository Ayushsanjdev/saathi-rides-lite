import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "./language";
import { Button, Copy, useUI } from "./ui";
export function Picker({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { colors, styles } = useUI();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Copy>{label}</Copy>
      <Button
        secondary
        title={options.find((o) => o.id === value)?.label ?? label}
        label={t(label)}
        onPress={() => setOpen(true)}
        disabled={disabled || !options.length}
      />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0006",
            justifyContent: "flex-end",
          }}
        >
          <SafeAreaView
            style={{
              maxHeight: "80%",
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View style={styles.content}>
              <Copy>{label}</Copy>
              <ScrollView>
                {options.map((option) => (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: option.id === value }}
                    onPress={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    style={{
                      minHeight: 52,
                      padding: 14,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={styles.text}>{t(option.label)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Button secondary title="Close" onPress={() => setOpen(false)} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
