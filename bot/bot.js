const TelegramBot = require('node-telegram-bot-api');

// ⚠️ ЗАМЕНИ НА СВОЙ ТОКЕН (после /revoke в BotFather)
const BOT_TOKEN = '8368101860:AAHoMJT_EsaQ88fRbYuRim3JCNxm21V9DeA';

// Твой Telegram ID для уведомлений (узнать можно через @userinfobot)
const SELLER_ID = '7846290046';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Товары
const PRODUCTS = {
    'vip_def': {
        title: '🛡️ VIP DEF',
        description: 'VIP защита от клана Europe и Luka Frizz на 1 месяц',
        price: 100, // Stars
        payload: 'vip_def_1month'
    }
};

// Команда /start
bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const param = match[1].trim();
    
    if (param === 'buy_vip' || param === '') {
        // Показываем меню
        await bot.sendMessage(chatId, 
            '👑 *Добро пожаловать в магазин Luka Frizz!*\n\n' +
            '🛡️ *VIP DEF* — 100 ⭐\n' +
            '• Тебя не пошлют нахуй\n' +
            '• Возможность сесть на обучение в КМ\n' +
            '• Осталось 15 мест\n\n' +
            'Нажми кнопку ниже чтобы купить:',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🛡️ Купить VIP DEF — 100 ⭐', callback_data: 'buy_vip_def' }],
                        [{ text: '💬 Связаться с продавцом', url: 'https://t.me/FR1E3A' }]
                    ]
                }
            }
        );
    }
});

// Обработка нажатия кнопки "Купить"
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data === 'buy_vip_def') {
        const product = PRODUCTS['vip_def'];
        
        try {
            // Отправляем инвойс на Stars
            await bot.sendInvoice(
                chatId,
                product.title,
                product.description,
                product.payload,
                '', // provider_token пустой для Stars
                'XTR', // Валюта Stars
                [{ label: product.title, amount: product.price }],
                {
                    start_parameter: 'buy_vip',
                    protect_content: true
                }
            );
            
            await bot.answerCallbackQuery(query.id);
        } catch (error) {
            console.error('Ошибка создания инвойса:', error);
            await bot.answerCallbackQuery(query.id, {
                text: '❌ Ошибка. Попробуй позже.',
                show_alert: true
            });
        }
    }
});

// Предварительная проверка платежа
bot.on('pre_checkout_query', async (query) => {
    // Подтверждаем что можем обработать платёж
    await bot.answerPreCheckoutQuery(query.id, true);
});

// Успешный платёж!
bot.on('message', async (msg) => {
    if (msg.successful_payment) {
        const payment = msg.successful_payment;
        const chatId = msg.chat.id;
        const user = msg.from;
        
        // Сообщение покупателю
        await bot.sendMessage(chatId,
            '✅ *Оплата прошла успешно!*\n\n' +
            '🛡️ Ты купил VIP DEF на 1 месяц.\n\n' +
            'Напиши @FR1E3A чтобы получить доступ.\n' +
            'Покажи это сообщение как подтверждение оплаты.',
            { parse_mode: 'Markdown' }
        );
        
        // Уведомление продавцу
        const sellerMessage = 
            '🎉 *НОВАЯ ПОКУПКА!*\n\n' +
            `👤 Покупатель: ${user.first_name} ${user.last_name || ''}\n` +
            `📱 Username: @${user.username || 'нет'}\n` +
            `🆔 ID: \`${user.id}\`\n\n` +
            `💰 Товар: ${payment.invoice_payload}\n` +
            `⭐ Сумма: ${payment.total_amount} Stars\n` +
            `🧾 ID платежа: \`${payment.telegram_payment_charge_id}\``;
        
        try {
            await bot.sendMessage(SELLER_ID, sellerMessage, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Не удалось отправить уведомление продавцу:', e);
        }
        
        console.log('✅ Успешная оплата:', {
            user: user.username || user.id,
            amount: payment.total_amount,
            payload: payment.invoice_payload
        });
    }
});

console.log('🤖 Бот запущен!');
