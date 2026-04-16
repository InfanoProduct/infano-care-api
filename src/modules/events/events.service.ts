import { prisma } from '../../db/client.js';
import { broadcastEventUpdate, broadcastQuestionCount } from './events.socket.js';

export class EventsService {
  private static questionsByEvent: Map<string, any[]> = new Map();

  private getQuestionsForEvent(eventId: string) {
    if (!EventsService.questionsByEvent.has(eventId)) {
      // Initialize with mock data
      EventsService.questionsByEvent.set(eventId, [
        {
          id: '1',
          eventId,
          content: 'How can I maintain a healthy routine during exams?',
          authorName: 'Ananya',
          answer: 'Prioritize sleep and stay hydrated. Small breaks every 45 mins are key.',
          expertName: 'Dr. Smith',
          answeredAt: new Date(Date.now() - 1000 * 60 * 10),
          isAnonymous: false
        },
        {
          id: '2',
          eventId,
          content: 'What foods help with menstrual cramps?',
          authorName: 'Anonymous',
          answer: 'Try ginger tea and dark chocolate in moderation. Bananas are also great!',
          expertName: 'Dr. Smith',
          answeredAt: new Date(Date.now() - 1000 * 60 * 5),
          isAnonymous: true
        }
      ]);
    }
    return EventsService.questionsByEvent.get(eventId)!;
  }

  async submitQuestion(userId: string, eventId: string, content: string, isAnonymous: boolean) {
    const question = {
      id: "q-" + Math.random().toString(36).substring(2, 9),
      eventId,
      userId: isAnonymous ? 'anonymous' : userId,
      authorName: isAnonymous ? 'Anonymous' : 'Community Member',
      content,
      isAnonymous,
      createdAt: new Date(),
      answeredAt: new Date(), // Simulating immediate answer for demo
      answer: "Thank you for your question! We will address this shortly.",
      expertName: "Dr. Expert",
    };

    // Save to in-memory store
    const questions = this.getQuestionsForEvent(eventId);
    questions.push(question);

    // Broadcast the new "moderated" question to the event room
    broadcastEventUpdate(eventId, {
      type: 'new_question',
      data: question
    });

    broadcastQuestionCount(eventId, questions.length);

    return question;
  }

  async getEventQuestions(eventId: string) {
    return this.getQuestionsForEvent(eventId);
  }

  async setReminder(userId: string, eventId: string) {
    return { success: true, eventId, userId, message: 'Reminder has been set!' };
  }
}
