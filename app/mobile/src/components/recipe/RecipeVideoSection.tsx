import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { InlineFieldError } from './InlineFieldError';
import { recipeFormStyles as styles } from './recipeFormStyles';

export type LocalVideoSelection = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

type Props = {
  onPickPress: () => void;
  localVideo: LocalVideoSelection | null;
  onClearLocal: () => void;
  /** When set and no local replacement, user still has a server video (edit mode). */
  remoteVideoUrl?: string | null;
  requireSelection: boolean;
  attemptedSubmit: boolean;
  errorMessage?: string;
};

export function RecipeVideoSection({
  onPickPress,
  localVideo,
  onClearLocal,
  remoteVideoUrl,
  requireSelection,
  attemptedSubmit,
  errorMessage,
}: Props) {
  const hasRemoteOnly = Boolean(remoteVideoUrl) && !localVideo;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{requireSelection ? 'Video' : 'Video (optional)'}</Text>

      {hasRemoteOnly ? (
        <Text style={styles.videoHint}>
          Using saved video from the server. Pick a video below to replace it.
        </Text>
      ) : null}

      <Pressable
        onPress={onPickPress}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Pick a video"
      >
        <Text style={styles.secondaryButtonText}>
          {localVideo ? 'Change video' : 'Pick a video'}
        </Text>
      </Pressable>

      {localVideo ? (
        <>
          <View style={styles.mediaWrap} accessibilityLabel="Recipe video preview">
            <Video
              style={styles.mediaVideo}
              source={{ uri: localVideo.uri }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
          </View>
          <View style={styles.videoMeta}>
            <Text style={styles.videoLine} numberOfLines={1}>
              {localVideo.fileName ?? localVideo.uri}
            </Text>
            <Pressable
              onPress={onClearLocal}
              accessibilityRole="button"
              accessibilityLabel="Remove selected video"
            >
              <Text style={styles.removeText}>Remove video</Text>
            </Pressable>
          </View>
        </>
      ) : hasRemoteOnly ? (
        <View style={styles.mediaWrap} accessibilityLabel="Recipe video preview">
          <Video
            style={styles.mediaVideo}
            source={{ uri: remoteVideoUrl as string }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        </View>
      ) : (
        <View style={styles.mediaPlaceholder} accessibilityLabel="No video selected">
          <Text style={styles.mediaPlaceholderText}>No video selected</Text>
        </View>
      )}

      {attemptedSubmit && requireSelection ? <InlineFieldError message={errorMessage} /> : null}
    </View>
  );
}
