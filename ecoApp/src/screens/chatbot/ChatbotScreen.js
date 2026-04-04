import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { sendChatMessage } from '../../api/api';
import { Colors, Shadow, Radii, Spacing } from '../../theme';

const QUICK_QUESTIONS = [
  'How do I reduce my carbon footprint?',
  'Tips for eco-friendly transport',
  'Best eco-friendly diet choices',
  'How to save energy at home?',
  'What is carbon offsetting?',
  'How is my Eco Score calculated?',
];

const BOT_INTRO = {
  id: 'intro',
  role: 'bot',
  text: `👋 **Hello! I'm Eco Coach** 🌿\n\nI'm your AI-powered sustainability assistant. Ask me anything about reducing your carbon footprint, eco-friendly lifestyle choices, or understanding your emissions.\n\nOr tap a quick question below to get started!`,
  time: new Date(),
};

export default function ChatbotScreen() {
  const [messages, setMessages] = useState([BOT_INTRO]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const scrollRef               = useRef(null);

  const sendMsg = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', text: msg, time: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Build history array for Gemini multi-turn (exclude intro message)
      const history = updatedMessages
        .filter(m => m.id !== 'intro')
        .map(m => ({ role: m.role === 'user' ? 'user' : 'bot', content: m.text }));

      const res = await sendChatMessage(msg, history);
      const botMsg = { id: Date.now() + 1, role: 'bot', text: res.data.reply, time: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      const errMsg = { id: Date.now() + 1, role: 'bot', text: '⚠️ Sorry, I couldn\'t connect right now. Please try again.', time: new Date() };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderText = (text) => {
    // Simple markdown-like rendering for **bold**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <Text key={i} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text>
        : <Text key={i}>{p}</Text>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🤖</Text>
        <View>
          <Text style={styles.headerTitle}>Eco Coach</Text>
          <Text style={styles.headerSub}>AI-powered sustainability assistant</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m) => (
          <View key={m.id} style={[styles.msgRow, m.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
            {m.role === 'bot' && <Text style={styles.botAvatar}>🌿</Text>}
            <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot}>
                {renderText(m.text)}
              </Text>
              <Text style={[styles.time, m.role === 'user' && { color: 'rgba(255,255,255,0.7)' }]}>
                {m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={[styles.msgRow, styles.msgRowBot]}>
            <Text style={styles.botAvatar}>🌿</Text>
            <View style={styles.bubbleBot}>
              <Text style={styles.typing}>● ● ●</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Questions */}
      {messages.length <= 2 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickContent}>
          {QUICK_QUESTIONS.map((q, i) => (
            <TouchableOpacity key={i} style={styles.quickBtn} onPress={() => sendMsg(q)}>
              <Text style={styles.quickText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          mode="outlined"
          placeholder="Ask Eco Coach anything..."
          value={input}
          onChangeText={setInput}
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          theme={{ roundness: 24 }}
          onSubmitEditing={() => sendMsg()}
          returnKeyType="send"
          right={
            <TextInput.Icon
              icon="send"
              color={input.trim() ? Colors.primary : Colors.textMuted}
              onPress={() => sendMsg()}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, paddingTop: 40, gap: 12,
  },
  headerIcon:  { fontSize: 36 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  onlineDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#76FF03', marginLeft: 'auto' },
  messages:        { flex: 1 },
  messagesContent: { padding: Spacing.md, paddingBottom: 8 },
  msgRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  msgRowBot:  { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  botAvatar:  { fontSize: 22, marginRight: 8 },
  bubble:     { maxWidth: '80%', borderRadius: Radii.lg, padding: 12 },
  bubbleBot:  { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleUser: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleTextBot:  { fontSize: 14, color: Colors.dark, lineHeight: 20 },
  bubbleTextUser: { fontSize: 14, color: Colors.white, lineHeight: 20 },
  time:       { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  typing:     { fontSize: 16, color: Colors.textMuted, letterSpacing: 4 },
  quickScroll:   { maxHeight: 50, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  quickContent:  { paddingHorizontal: Spacing.md, paddingVertical: 8, gap: 8 },
  quickBtn:      { backgroundColor: Colors.background, borderRadius: Radii.pill, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  quickText:     { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  inputRow:      { backgroundColor: Colors.white, padding: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  input:         { backgroundColor: Colors.white },
});
