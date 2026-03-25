import notifee, { TriggerType, RepeatFrequency } from '@notifee/react-native';
import StorageService from './StorageService';

const CHANNEL_ID = 'medinova-reminders';

export interface ReminderTimes {
    breakfast: { enabled: boolean; hour: number; minute: number };
    lunch: { enabled: boolean; hour: number; minute: number };
    snack: { enabled: boolean; hour: number; minute: number };
    dinner: { enabled: boolean; hour: number; minute: number };
    exercise: { enabled: boolean; hour: number; minute: number };
}

const DEFAULT_REMINDERS: ReminderTimes = {
    breakfast: { enabled: false, hour: 8, minute: 0 },
    lunch: { enabled: false, hour: 13, minute: 0 },
    snack: { enabled: false, hour: 16, minute: 0 },
    dinner: { enabled: false, hour: 19, minute: 0 },
    exercise: { enabled: false, hour: 17, minute: 0 },
};

class NotificationService {
    async init() {
        console.log('[NotificationService] Requesting permission...');
        await notifee.requestPermission();
        console.log('[NotificationService] Creating channel...');
        await notifee.createChannel({
            id: CHANNEL_ID,
            name: 'MediNova Reminders',
            sound: 'default',
        });
        console.log('[NotificationService] Init complete.');
    }

    async getReminders(): Promise<ReminderTimes> {
        const stored = await StorageService.getItem('medinova-reminders-config');
        if (stored) {
            try {
                return { ...DEFAULT_REMINDERS, ...JSON.parse(stored) };
            } catch {
                return DEFAULT_REMINDERS;
            }
        }
        return DEFAULT_REMINDERS;
    }

    async saveReminders(reminders: ReminderTimes) {
        await StorageService.setItem('medinova-reminders-config', JSON.stringify(reminders));
    }

    private async scheduleDailyNotification(id: string, title: string, body: string, hour: number, minute: number) {
        // Cancel first to overwrite if exists
        await notifee.cancelNotification(id);

        const now = new Date();
        const triggerDate = new Date();
        triggerDate.setHours(hour, minute, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (triggerDate <= now) {
            triggerDate.setDate(triggerDate.getDate() + 1);
            console.log(`[NotificationService] Time has passed for today. Scheduling ${id} for tomorrow at ${triggerDate.toLocaleString()}`);
        } else {
            console.log(`[NotificationService] Scheduling ${id} for today at ${triggerDate.toLocaleString()}`);
        }

        await notifee.createTriggerNotification(
            {
                id,
                title,
                body,
                android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: triggerDate.getTime(),
                repeatFrequency: RepeatFrequency.DAILY,
            }
        );
        console.log(`[NotificationService] Successfully scheduled ${id}`);
    }

    async scheduleMealReminder(meal: keyof Omit<ReminderTimes, 'exercise'>, hour: number, minute: number) {
        const mealNames = {
            breakfast: "Breakfast",
            lunch: "Lunch",
            snack: "Snack",
            dinner: "Dinner"
        };
        await this.scheduleDailyNotification(
            `meal-${meal}`,
            `Time for ${mealNames[meal]}! 🍽️`,
            `Don't forget to track your meal in your plan.`,
            hour,
            minute
        );
    }

    async scheduleExerciseReminder(hour: number, minute: number) {
        await this.scheduleDailyNotification(
            'exercise-reminder',
            'Time to workout! 💪',
            `Don't forget to complete your daily exercises.`,
            hour,
            minute
        );
    }

    async cancelReminder(id: string) {
        console.log(`[NotificationService] Cancelling schedule for ${id}`);
        await notifee.cancelNotification(id);
    }

    async applyReminderConfig(times: ReminderTimes) {
        await this.saveReminders(times);

        // Meal reminders
        for (const meal of ['breakfast', 'lunch', 'snack', 'dinner'] as const) {
            if (times[meal].enabled) {
                await this.scheduleMealReminder(meal, times[meal].hour, times[meal].minute);
            } else {
                await this.cancelReminder(`meal-${meal}`);
            }
        }

        // Exercise reminder
        if (times.exercise.enabled) {
            await this.scheduleExerciseReminder(times.exercise.hour, times.exercise.minute);
        } else {
            await this.cancelReminder('exercise-reminder');
        }
    }
}

export default new NotificationService();
