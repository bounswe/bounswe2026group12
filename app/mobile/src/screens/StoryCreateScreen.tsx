import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedRoute } from '../components/ProtectedRoute';

/**
 * Placeholder for web `StoryCreatePage` — full form + API will replace mock save later.
 */
function StoryCreateContent() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);

  function handleMockSave() {
    setSaved(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.padded}>
        <Text style={styles.heading} accessibilityRole="header">
          Create story
        </Text>
        <Text style={styles.hint}>
          Placeholder screen. Linked recipe picker and `createStory` API will be added later.
        </Text>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Story title"
          accessibilityLabel="Story title"
        />
        <Text style={styles.label}>Body</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={body}
          onChangeText={setBody}
          placeholder="Story body"
          multiline
          accessibilityLabel="Story body"
        />
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleMockSave}
          accessibilityRole="button"
          accessibilityLabel="Save story mock"
        >
          <Text style={styles.buttonText}>Save (mock)</Text>
        </Pressable>
        {saved ? (
          <Text style={styles.success}>Saved locally (no API).</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export default function StoryCreateScreen() {
  return (
    <ProtectedRoute>
      <StoryCreateContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  padded: { flex: 1, padding: 20 },
  heading: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 14, opacity: 0.7, marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.88 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  success: { marginTop: 16, fontSize: 15, color: '#15803d' },
});
