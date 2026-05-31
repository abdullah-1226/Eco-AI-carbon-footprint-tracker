import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  PanResponder, Animated, Dimensions, Image,
  ActivityIndicator, Platform,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const SW = Dimensions.get('window').width;
const SH = Dimensions.get('window').height;

// ── Crop frame sizes ──────────────────────────────────────────────────────────
const AVATAR_FRAME = { w: SW * 0.72, h: SW * 0.72, radius: (SW * 0.72) / 2 };
const COVER_FRAME  = { w: SW * 0.92, h: SW * 0.92 * (7 / 16), radius: 16 };

// ─────────────────────────────────────────────────────────────────────────────
export default function PhotoCropModal({ visible, imageUri, mode, onDone, onCancel }) {
  // mode: 'avatar' | 'cover'
  const frame = mode === 'avatar' ? AVATAR_FRAME : COVER_FRAME;

  // Image natural size (loaded once)
  const [imgSize, setImgSize] = useState({ w: SW, h: SW });

  // Current transform: scale + pan offset
  const scale     = useRef(new Animated.Value(1)).current;
  const panX      = useRef(new Animated.Value(0)).current;
  const panY      = useRef(new Animated.Value(0)).current;

  // Tracked values for gesture math
  const lastScale = useRef(1);
  const lastPan   = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);

  const [saving, setSaving] = useState(false);

  // Reset transform whenever modal opens with a new image
  const handleLoad = useCallback(() => {
    Image.getSize(imageUri, (w, h) => {
      setImgSize({ w, h });
      // Initial scale: fill the frame
      const fill = Math.max(frame.w / w, frame.h / h);
      lastScale.current = fill;
      scale.setValue(fill);
      lastPan.current = { x: 0, y: 0 };
      panX.setValue(0);
      panY.setValue(0);
    });
  }, [imageUri, frame]);

  // ── PanResponder — handles single-finger drag + two-finger pinch ──────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // ── Pinch to zoom ──────────────────────────────────────────────
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (lastPinchDist.current === 0) {
            lastPinchDist.current = dist;
            return;
          }
          const delta = dist / lastPinchDist.current;
          lastPinchDist.current = dist;

          const minScale = Math.max(frame.w / imgSize.w, frame.h / imgSize.h);
          const newScale = Math.max(minScale, Math.min(lastScale.current * delta, 6));
          lastScale.current = newScale;
          scale.setValue(newScale);
        } else {
          // ── Single-finger drag ─────────────────────────────────────────
          lastPinchDist.current = 0;
          const newX = lastPan.current.x + gs.dx;
          const newY = lastPan.current.y + gs.dy;
          panX.setValue(newX);
          panY.setValue(newY);
        }
      },

      onPanResponderRelease: (_, gs) => {
        lastPinchDist.current = 0;
        if (gs.numberActiveTouches === 0) {
          lastPan.current = {
            x: lastPan.current.x + gs.dx,
            y: lastPan.current.y + gs.dy,
          };
        }
      },
    })
  ).current;

  // ── Crop and return URI ───────────────────────────────────────────────────
  const handleDone = async () => {
    setSaving(true);
    try {
      // The frame centre on screen is (SW/2, SH/2).
      // Image rendered size:
      const renderedW = imgSize.w * lastScale.current;
      const renderedH = imgSize.h * lastScale.current;

      // Top-left of rendered image relative to screen centre:
      const imgLeft = (SW - renderedW) / 2 + lastPan.current.x;
      const imgTop  = (SH - renderedH) / 2 + lastPan.current.y;

      // Frame top-left on screen:
      const fLeft = (SW - frame.w) / 2;
      const fTop  = (SH - frame.h) / 2;

      // Crop origin in image pixel coords:
      const cropX = Math.max(0, (fLeft - imgLeft) / lastScale.current);
      const cropY = Math.max(0, (fTop  - imgTop)  / lastScale.current);
      const cropW = Math.min(frame.w / lastScale.current, imgSize.w - cropX);
      const cropH = Math.min(frame.h / lastScale.current, imgSize.h - cropY);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.round(cropX),
              originY: Math.round(cropY),
              width:   Math.round(Math.max(1, cropW)),
              height:  Math.round(Math.max(1, cropH)),
            },
          },
          // Resize to a reasonable max so files aren't huge
          { resize: mode === 'avatar' ? { width: 512, height: 512 } : { width: 1200 } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      onDone(result.uri);
    } catch {
      // Fallback: return original if crop fails
      onDone(imageUri);
    } finally {
      setSaving(false);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={s.root}>

        {/* ── Draggable image ── */}
        <Animated.Image
          source={{ uri: imageUri }}
          style={[
            s.img,
            {
              width:  imgSize.w,
              height: imgSize.h,
              transform: [
                { translateX: panX },
                { translateY: panY },
                { scale },
              ],
            },
          ]}
          resizeMode="contain"
          onLoad={handleLoad}
          {...panResponder.panHandlers}
        />

        {/* ── Dim overlay with crop hole ── */}
        <View style={s.overlay} pointerEvents="none">
          {/* Top dim */}
          <View style={[s.dimBlock, { height: (SH - frame.h) / 2 }]} />
          {/* Middle row */}
          <View style={s.dimRow}>
            <View style={[s.dimBlock, { width: (SW - frame.w) / 2, flex: 0 }]} />
            {/* Clear frame window */}
            <View style={[
              s.frameWindow,
              { width: frame.w, height: frame.h, borderRadius: frame.radius },
            ]} />
            <View style={[s.dimBlock, { width: (SW - frame.w) / 2, flex: 0 }]} />
          </View>
          {/* Bottom dim */}
          <View style={[s.dimBlock, { height: (SH - frame.h) / 2 }]} />
        </View>

        {/* ── Frame border ── */}
        <View
          pointerEvents="none"
          style={[
            s.frameBorder,
            {
              width:  frame.w,
              height: frame.h,
              borderRadius: frame.radius,
              left: (SW - frame.w) / 2,
              top:  (SH - frame.h) / 2,
            },
          ]}
        />

        {/* ── Instruction label ── */}
        <View style={s.instructWrap} pointerEvents="none">
          <Text style={s.instructTxt}>
            {mode === 'avatar' ? 'Drag & pinch to position your photo' : 'Drag & pinch to frame your cover'}
          </Text>
        </View>

        {/* ── Buttons ── */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.doneBtn} onPress={handleDone} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#1A2318" size="small" />
              : <Text style={s.doneTxt}>Use Photo ✓</Text>}
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },

  img: { position: 'absolute' },

  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  dimBlock: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  dimRow:   { flexDirection: 'row' },
  frameWindow: { backgroundColor: 'transparent' },

  frameBorder: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#B2D054',
    shadowColor: '#B2D054',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },

  instructWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20,
  },
  instructTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },

  btnRow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 28,
    flexDirection: 'row', gap: 14, paddingHorizontal: 24,
    alignSelf: 'center',
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
  },
  cancelTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#B2D054',
    alignItems: 'center',
  },
  doneTxt: { color: '#1A2318', fontSize: 15, fontWeight: '900' },
});
