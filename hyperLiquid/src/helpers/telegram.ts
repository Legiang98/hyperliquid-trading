export async function sendTelegramMessage(chatId: string, token: string, message: string): Promise<void> {
    try {
        console.log("Sending Telegram message:", message);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: message }),
        });
    } catch (err) {
        console.error("Failed to send Telegram message:", err);
    }
}

