import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Header } from '../../components/Header';
import { chatApi } from '../../api/chats';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../../config/env';

export const ChatScreen = ({ route }: any) => {
  const { donationId, title } = route.params || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchMessages = async () => {
    try {
      if (!donationId) return;
      const res = await chatApi.getMessages(donationId);
      if (res.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      if (donationId) {
        newSocket.emit('join_chat', donationId);
      }
    });

    newSocket.on('receive_message', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [donationId]);

  const handleSend = async () => {
    if (!inputText.trim() || !donationId) return;
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await chatApi.sendMessage(donationId, textToSend);
      if (res.success && res.chatMessage) {
        setMessages((prev) => [...prev, res.chatMessage]);
      }
      if (socket) {
        socket.emit('send_message', { donationId, text: textToSend, sender: user?.name });
      }
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title={title ? `Chat: ${title}` : 'Real-time Chat'} showLogout={false} />

      <FlatList
        data={messages}
        keyExtractor={(item, index) => item._id || index.toString()}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?._id || item.sender === user?.name;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={styles.sender}>{item.senderName || item.sender || 'Coordinator'}</Text>
              <Text style={styles.text}>{item.text || item.message}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#64748B"
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  messageList: {
    padding: 16,
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  bubbleMine: {
    backgroundColor: '#10B981',
    alignSelf: 'flex-end',
  },
  bubbleOther: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sender: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
