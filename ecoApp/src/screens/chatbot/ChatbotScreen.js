import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sendChatMessage } from '../../api/api';
import ScreenTransition from '../../components/ScreenTransition';

const C = {
  bg:      '#060F08',
  card:    '#0D1A10',
  border:  'rgba(178,208,84,0.15)',
  accent:  '#B2D054',
  text:    '#EFF4EE',
  textSub: 'rgba(239,244,238,0.52)',
};

const QUICK_QUESTIONS = [
  'How do I reduce my carbon footprint?',
  'Tips for eco-friendly transport',
  'Best eco-friendly diet choices',
  'How to save energy at home?',
  'What is carbon offsetting?',
  'How is my Eco Score calculated?',
];

const BOT_INTRO = {
  id: 'intro', role: 'bot', time: new Date(),
  text: `👋 **Hello! I'm Eco Coach** 🌿\n\nI'm your AI-powered sustainability assistant. Ask me anything about reducing your carbon footprint, eco-friendly lifestyle choices, or understanding your emissions.\n\nOr tap a quick question below to get started!`,
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
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const history = updated
        .filter(m => m.id !== 'intro')
        .map(m => ({ role: m.role === 'user' ? 'user' : 'bot', content: m.text }));
      const res    = await sendChatMessage(msg, history);
      const botMsg = { id: Date.now() + 1, role: 'bot', text: res.data.reply, time: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot', time: new Date(),
        text: '⚠️ Sorry, I couldn\'t connect right now. Please try again.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderText = (text) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <Text key={i} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text>
        : <Text key={i}>{p}</Text>
    );

  return (
    <ScreenTransition>
      <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <LinearGradient colors={['#0A1A0F', '#071209']} style={S.header}>
          <View style={S.headerAvatar}>
            <Text style={S.headerAvatarTxt}>🤖</Text>
          </View>
          <View style={S.headerText}>
            <Text style={S.headerTitle}>Eco Coach</Text>
            <Text style={S.headerSub}>AI-powered sustainability assistant</Text>
          </View>
          <View style={S.onlineDot} />
        </LinearGradient>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={S.messages}
          contentContainerStyle={S.msgContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(m => (
            <View key={m.id} style={[S.msgRow, m.role === 'user' ? S.rowUser : S.rowBot]}>
              {m.role === 'bot' && (
                <View style={S.botAvatarWrap}>
                  <Text style={S.botAvatarTxt}>🌿</Text>
                </View>
              )}
              <View style={[S.bubble, m.role === 'user' ? S.bubbleUser : S.bubbleBot]}>
                <Text style={m.role === 'user' ? S.txtUser : S.txtBot}>
                  {renderText(m.text)}
                </Text>
                <Text style={[S.time, m.role === 'user' && { color: 'rgba(7,18,9,0.6)' }]}>
                  {m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[S.msgRow, S.rowBot]}>
              <View style={S.botAvatarWrap}>
                <Text style={S.botAvatarTxt}>🌿</Text>
              </View>
              <View style={S.bubbleBot}>
                <Text style={S.typing}>● ● ●</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick questions */}
        {messages.length <= 2 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={S.quickScroll} contentContainerStyle={S.quickContent}
          >
            {QUICK_QUESTIONS.map((q, i) => (
              <TouchableOpacity key={i} style={S.quickBtn} onPress={() => sendMsg(q)} activeOpacity={0.75}>
                <Text style={S.quickTxt}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input row */}
        <View style={S.inputRow}>
          <TextInput
            style={S.input}
            placeholder="Ask Eco Coach anything..."
            placeholderTextColor={C.textSub}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMsg()}
            returnKeyType="send"
            multiline={false}
          />
          <TouchableOpacity
            style={[S.sendBtn, !input.trim() && S.sendBtnDim]}
            onPress={() => sendMsg()}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator size="small" color="#071209" />
              : <Text style={S.sendBtnTxt}>➤</Text>
            }
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </ScreenTransition>
  );
}

const S = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 20 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerAvatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(178,208,84,0.15)',
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerAvatarTxt: { fontSize: 22 },
  headerText:      { flex: 1 },
  headerTitle:     { fontSize: 17, fontWeight: '800', color: C.text },
  headerSub:       { fontSize: 11, color: C.textSub, marginTop: 1 },
  onlineDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#52C77A',
    shadowColor: '#52C77A', shadowOpacity: 0.6, shadowRadius: 4 },

  // Messages
  messages:   { flex: 1, backgroundColor: C.bg },
  msgContent: { padding: 14, paddingBottom: 8, gap: 10 },

  msgRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowBot:  { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },

  botAvatarWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(178,208,84,0.12)',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  botAvatarTxt: { fontSize: 16 },

  bubble:     { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot:  {
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#B2D054',
    borderBottomRightRadius: 4,
  },
  txtBot:  { fontSize: 14, color: C.text, lineHeight: 20 },
  txtUser: { fontSize: 14, color: '#071209', fontWeight: '600', lineHeight: 20 },
  time:    { fontSize: 10, color: C.textSub, marginTop: 5 },
  typing:  { fontSize: 16, color: C.accent, letterSpacing: 4 },

  // Quick questions
  quickScroll:  {
    maxHeight: 52, backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  quickContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  quickBtn:     {
    backgroundColor: '#0A1A0F', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: C.border,
  },
  quickTxt:     { fontSize: 12, color: C.accent, fontWeight: '600' },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
  },
  input: {
    flex: 1, backgroundColor: '#0A1608',
    borderRadius: 24, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: C.text, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDim: { backgroundColor: 'rgba(178,208,84,0.3)' },
  sendBtnTxt: { fontSize: 18, color: '#071209', fontWeight: '800' },
});
