import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { useAuth } from '../../context/AuthContext';
import { sendFoodAIChat } from '../../api/ai';
import { COLORS } from '../../theme/colors';
import { Bot, Send, Trash2, ArrowRight, Sparkles } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const FoodAIScreen = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const role = user?.role?.toUpperCase() || 'DONOR';

  const getRoleSuggestions = () => {
    switch (role) {
      case 'DONOR':
        return [
          'How do I donate food?',
          'How do I check my donation status?',
          'How does pickup work?',
          'What happens after a volunteer accepts my donation?',
        ];
      case 'NGO':
        return [
          'How do I accept food?',
          'How can I track a delivery?',
          'What happens when food is delivered?',
          'How do I manage received donations?',
        ];
      case 'VOLUNTEER':
        return [
          'How do I accept a pickup?',
          'How does route tracking work?',
          'What should I do after reaching the NGO?',
          'How do I mark food as Delivered?',
        ];
      case 'ADMIN':
        return [
          'How do I approve an NGO?',
          'How do I approve a volunteer?',
          'How can I monitor donations?',
          'What can an administrator manage?',
        ];
      default:
        return [
          'How do I donate food?',
          'How do I check my donation status?',
          'How does pickup work?',
        ];
    }
  };

  const suggestions = getRoleSuggestions();

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: formatTime(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendFoodAIChat({
        message: textToSend,
        role: user?.role || 'DONOR',
        userName: user?.name || 'FoodBridge Member',
        history: historyPayload,
      });

      const replyContent = res.reply || res.response || res.message || 'I am here to help you with FoodBridge.';

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyContent,
        timestamp: formatTime(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'FOOD AI is temporarily unavailable. Please try again shortly.',
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Text style={{ fontSize: 13 }}>🍽️</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAssistant]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAssistant]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── HEADER ── */}
      <Header title="🍽️ FOOD AI" showBack={true} />

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>Your FoodBridge Assistant • {role}</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat} style={styles.clearBtn} activeOpacity={0.7}>
            <Trash2 size={14} color={COLORS.slate400} />
            <Text style={{ color: COLORS.slate400, fontSize: 11, fontWeight: '600', marginLeft: 4 }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── MESSAGES OR EMPTY STATE ── */}
      {messages.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyIconCircle}>
            <Text style={{ fontSize: 32 }}>🍽️</Text>
          </View>
          <Text style={styles.emptyTitle}>Hello! I'm FOOD AI</Text>
          <Text style={styles.emptySubtitle}>Your FoodBridge assistant</Text>
          <Text style={styles.emptyDesc}>
            I can help you with donations, pickups, deliveries, tracking, notifications, and other FoodBridge features.
          </Text>
          <Text style={styles.emptyPrompt}>How can I help you?</Text>

          {/* Role Suggestions */}
          <View style={styles.suggestionsWrapper}>
            <Text style={styles.suggestionsHeader}>Suggested Questions for {role}:</Text>
            {suggestions.map((promptText, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionCard}
                onPress={() => handleSend(promptText)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{promptText}</Text>
                <ArrowRight size={14} color="#10B981" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* ── TYPING INDICATOR ── */}
      {loading && (
        <View style={styles.typingContainer}>
          <View style={styles.assistantAvatar}>
            <Text style={{ fontSize: 13 }}>🍽️</Text>
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.typingText}>FOOD AI is typing...</Text>
          </View>
        </View>
      )}

      {/* Quick suggestions scrollbar on active chat */}
      {messages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickChipsBar}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        >
          {suggestions.slice(0, 3).map((promptText, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.chipBtn}
              onPress={() => handleSend(promptText)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>{promptText}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── INPUT BAR ── */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask FOOD AI..."
          placeholderTextColor={COLORS.slate500}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.7}
        >
          <Send size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* ── BOTTOM NAVBAR ── */}
      <BottomNavbar activeTab="food-ai" />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark900,
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.15)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  messagesList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 2,
  },
  bubbleAssistant: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19,
  },
  msgTextUser: {
    color: '#0F172A',
    fontWeight: '600',
  },
  msgTextAssistant: {
    color: COLORS.slate200,
  },
  timestamp: {
    fontSize: 9,
    marginTop: 4,
  },
  timestampUser: {
    color: 'rgba(15, 23, 42, 0.6)',
    textAlign: 'right',
  },
  timestampAssistant: {
    color: COLORS.slate500,
    textAlign: 'left',
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.slate400,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  emptyPrompt: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  suggestionsWrapper: {
    width: '100%',
    marginTop: 8,
  },
  suggestionsHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: COLORS.slate300,
    flex: 1,
    marginRight: 8,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 11,
    color: COLORS.slate400,
  },
  quickChipsBar: {
    maxHeight: 36,
    marginBottom: 6,
  },
  chipBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.slate300,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0B132B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
