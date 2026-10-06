import React, { useState, useEffect, useRef } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { chatApi } from '../../api/chats';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../../config/env';
import { COLORS } from '../../theme/colors';
import { MessageSquare, Send, ArrowLeft, RefreshCw, User, Package } from 'lucide-react-native';

export const ChatScreen = ({ route, navigation }: any) => {
  const { donationId, chatId: initialChatId, title } = route.params || {};
  const { user } = useAuth();

  // Active chat state
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId || donationId || null);
  const [activeChatTitle, setActiveChatTitle] = useState<string>(title || 'Live Coordinator Chat');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Chat rooms list state
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [socket, setSocket] = useState<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Fetch all chat rooms for current user
  const fetchChatRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await chatApi.getChats();
      if (res.success && Array.isArray(res.chats)) {
        setChatRooms(res.chats);
      }
    } catch (err) {
      console.error('Failed to load chat rooms:', err);
    } finally {
      setLoadingRooms(false);
      setRefreshing(false);
    }
  };

  // Fetch messages for active chat
  const fetchMessages = async (targetId: string) => {
    try {
      setLoadingMessages(true);
      const res = await chatApi.getMessages(targetId);
      if (res.success && res.chat) {
        setMessages(res.chat.messages || []);
        if (res.chat.donation?.foodName) {
          setActiveChatTitle(`Chat: ${res.chat.donation.foodName}`);
        }
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    } else {
      fetchChatRooms();
    }
  }, [activeChatId]);

  // Socket setup for active conversation
  useEffect(() => {
    if (!activeChatId) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_room', activeChatId);
    });

    newSocket.on('receive_message', (data: any) => {
      if (data.chatId === activeChatId && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [activeChatId]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChatId) return;
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await chatApi.sendMessage(activeChatId, textToSend);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  const openConversation = (chat: any) => {
    setActiveChatId(chat._id);
    setActiveChatTitle(`Chat: ${chat.donation?.foodName || 'Donation Coordinator'}`);
  };

  const closeConversation = () => {
    setActiveChatId(null);
    fetchChatRooms();
  };

  // ── ROOMS LIST VIEW (When no specific chat is open) ──
  if (!activeChatId) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark900 }}>
        <Header title="Conversations" showBack={true} />

        <View style={styles.roomsHeader}>
          <Text style={styles.roomsHeading}>Active Coordinator Chats</Text>
          <Text style={styles.roomsSubheading}>Direct messages between Donors, NGOs, and Volunteers.</Text>
        </View>

        {loadingRooms && chatRooms.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            data={chatRooms}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.roomsList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChatRooms(); }} tintColor="#10B981" />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                  <MessageSquare size={48} color="#10B981" />
                </View>
                <Text style={styles.emptyTitle}>No Active Conversations</Text>
                <Text style={styles.emptyText}>
                  When you claim or post a donation on FoodBridge, you can coordinate pickup and delivery details here in real time.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const otherUser = user?.role === 'DONOR' ? item.ngo : item.donor;
              return (
                <TouchableOpacity
                  style={styles.roomCard}
                  onPress={() => openConversation(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.roomAvatar}>
                    <User size={20} color="#10B981" />
                  </View>
                  <View style={styles.roomContent}>
                    <View style={styles.roomTopRow}>
                      <Text style={styles.roomName} numberOfLines={1}>{otherUser?.name || 'Coordinator'}</Text>
                      <Text style={styles.roomTime}>
                        {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                    {item.donation?.foodName && (
                      <View style={styles.roomDonationTag}>
                        <Package size={12} color="#10B981" />
                        <Text style={styles.roomDonationText} numberOfLines={1}>{item.donation.foodName}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
        <BottomNavbar activeTab="chat" />
      </View>
    );
  }

  // ── DIRECT MESSAGES VIEW ──
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.chatTopBar}>
        <TouchableOpacity onPress={closeConversation} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.chatTitle} numberOfLines={1}>{activeChatTitle}</Text>
      </View>

      {loadingMessages && messages.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#10B981" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || index.toString()}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>No messages yet. Send a message to start coordinating!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender === user?._id || item.sender?._id === user?._id || item.sender === user?.name;
            return (
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={[styles.text, isMine && styles.textMine]}>{item.text || item.message}</Text>
                {item.createdAt && (
                  <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#64748B"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
          <Send size={18} color="#0F172A" />
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
  chatTopBar: {
    height: 56,
    backgroundColor: '#0A101D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  chatTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  roomsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  roomsHeading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  roomsSubheading: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  roomsList: {
    padding: 16,
    gap: 12,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  roomAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roomContent: {
    flex: 1,
  },
  roomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  roomTime: {
    color: '#64748B',
    fontSize: 11,
  },
  roomDonationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roomDonationText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageList: {
    padding: 16,
    gap: 12,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyMessagesText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 14,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#10B981',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  text: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 20,
  },
  textMine: {
    color: '#0F172A',
    fontWeight: '500',
  },
  timeText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMine: {
    color: 'rgba(15, 23, 42, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#0A101D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
