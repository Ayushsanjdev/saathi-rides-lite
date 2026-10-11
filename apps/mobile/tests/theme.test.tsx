import React from 'react';
import { Text, Pressable, useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme, palettes } from '../src/theme';
import { Field } from '../src/ui';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn(() => 'dark') }));
function Probe() {
  const { preference, scheme, setPreference } = useTheme();
  return <><Field label="Name" /><Text>{preference}:{scheme}</Text><Pressable accessibilityRole="button" accessibilityLabel="Light" onPress={() => setPreference('light')} /></>;
}
test('follows the device and persists an explicit choice across remounts', async () => {
  const nativeTheme = jest.spyOn(Appearance, 'setColorScheme');
  await AsyncStorage.clear();
  const first = render(<ThemeProvider><Probe /></ThemeProvider>);
  await waitFor(() => expect(screen.getByText('system:dark')).toBeTruthy());
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('unspecified');
  expect(screen.getByLabelText('Name')).toHaveStyle({backgroundColor:palettes.dark.card});
  expect(screen.getByLabelText('Name').props.keyboardAppearance).toBe('dark');
  fireEvent.press(screen.getByRole('button', {name:'Light'}));
  await waitFor(() => expect(screen.getByText('light:light')).toBeTruthy());
  expect(nativeTheme).toHaveBeenLastCalledWith('light');
  expect(screen.getByLabelText('Name')).toHaveStyle({backgroundColor:palettes.light.card});
  expect(screen.getByLabelText('Name').props.keyboardAppearance).toBe('light');
  await waitFor(async () => expect(await AsyncStorage.getItem('saathi-theme')).toBe('light'));
  first.unmount();
  render(<ThemeProvider><Probe /></ThemeProvider>);
  await waitFor(() => expect(screen.getByText('light:light')).toBeTruthy());
});
test('system mode responds to device theme changes', async () => {
  await AsyncStorage.clear();
  const view = render(<ThemeProvider><Probe /></ThemeProvider>);
  await waitFor(() => expect(screen.getByText('system:dark')).toBeTruthy());
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('unspecified');
  jest.mocked(useColorScheme).mockReturnValue('light');
  view.rerender(<ThemeProvider><Probe /></ThemeProvider>);
  expect(screen.getByText('system:light')).toBeTruthy();
});
