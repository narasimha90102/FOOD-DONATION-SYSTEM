import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { Send, ArrowLeft, Image } from 'lucide-react';

export default function ChatScreen() {
  const { activeChatId, user, navigate } = useAppStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!activeChatId) return;
    try {
      const res = await MobileApiService.get(`/chats/${activeChatId}`);
      setMessages(res.chat?.messages || []);
    } catch (e) {
      console.warn('[MobileChatHistory] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [activeChatId]);

  const handleSend = async () => {
    if (!text || !activeChatId) return;

    try {
      const res = await MobileApiService.post(`/chats/${activeChatId}/messages`, { text });
      setMessages([...messages, res.message]);
      setText('');
    } catch (e) {
      alert('Error sending mobile message.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Connecting coordinator threads...</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      
      {/* App bar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigate(user?.role === 'NGO' ? 'NGO_DASHBOARD' : 'DONOR_DASHBOARD')} style={styles.backBtn}>
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Surplus Coordination Chat</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {messages.map((item, idx) => {
          const isMine = item.sender.toString() === user?._id.toString();
          return (
            <View
              key={item._id || idx}
              style={[
                styles.msgBubble,
                isMine ? styles.msgMine : styles.msgOpponent
              ]}
            >
              <Text style={[styles.msgText, isMine ? styles.msgTextMine : null]}>{item.text}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Input console */}
      <View style={styles.inputConsole}>
        <TextInput
          placeholder="Type message..."
          placeholderTextColor="#64748b"
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Send size={16} color="#030712" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#030712',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  appBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  scrollBody: {
    padding: 20,
    gap: 12,
  },
  msgBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '75%',
  },
  msgMine: {
    backgroundColor: '#10b981',
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
  },
  msgOpponent: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
  },
  msgText: {
    color: '#f8fafc',
    fontSize: 13,
  },
  msgTextMine: {
    color: '#030712',
    fontWeight: '500',
  },
  inputConsole: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#030712',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: '#ffffff',
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: '#10b981',
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
