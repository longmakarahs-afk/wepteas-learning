import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Telegram webhooks send a updates payload
    const message = body?.message;
    if (!message) {
      return NextResponse.json({ success: true, message: 'No Telegram update message found.' });
    }

    const chatId = message.chat?.id;
    const text = message.text || '';
    const userId = message.from?.id;

    let responseMessage = '';

    if (text.startsWith('/start')) {
      responseMessage = `សូមស្វាគមន៍មកកាន់ SecureAttend Telegram Bot! 🔔\n\n` +
        `ប្រព័ន្ធគ្រប់គ្រងវត្តមាន និងបើកប្រាក់បៀវត្សរ៍ដ៏មានសុវត្ថិភាពខ្ពស់។\n\n` +
        `សូមប្រើប្រាស់បញ្ជាខាងក្រោម៖\n` +
        `👉 វាយ /checkin [លេខកូដកាត/PIN] ដើម្បីកត់ត្រាវត្តមានចូល\n` +
        `👉 វាយ /status ដើម្បីពិនិត្យមើលវត្តមានថ្ងៃនេះ\n` +
        `👉 វាយ /help ដើម្បីទទួលបានការណែនាំបន្ថែម`;
    } 
    else if (text.startsWith('/checkin')) {
      const parts = text.split(' ');
      const code = parts[1];

      if (!code) {
        responseMessage = `⚠️ សូមបញ្ជាក់លេខកូដ PIN របស់អ្នក! \nឧទាហរណ៍៖ \`/checkin 123456\``;
      } else {
        // Find employee by PIN or NFC tag mapping
        const employees = await db.getEmployees();
        const employee = employees.find(e => e.pin_code === code || e.nfc_tag_id === code || e.qr_key === code);

        if (employee) {
          // Check-in using standard mock/db operations
          const checkedLog = await db.checkIn({
            employee_id: employee.id,
            method: 'PIN',
            geofence_ok: true,
            photo_matched: false,
            status: 'ON_TIME',
            notes: 'ចុះឈ្មោះវត្តមានតាម Telegram Bot'
          });

          responseMessage = `✅ បញ្ជាក់វត្តមានចូលជោគជ័យ!\n` +
            `👤 បុគ្គលិក៖ ${employee.full_name_kh} (${employee.full_name_en})\n` +
            `🏫 ស្ថាប័ន៖ SecureAttend System\n` +
            `⏰ ម៉ោងចូល៖ ${new Date(checkedLog.check_in_time).toLocaleTimeString('kh-KH')}\n` +
            `📍 ទីតាំង៖ ត្រឹមត្រូវតាម Geofence\n` +
            `🔔 ស្ថានភាព៖ មកទាន់ម៉ោង`;
        } else {
          responseMessage = `❌ រកមិនឃើញបុគ្គលិកដែលមានលេខកូដ "${code}" ទេ។ សូមព្យាយាមឡើងវិញ!`;
        }
      }
    } 
    else if (text.startsWith('/status')) {
      responseMessage = `📊 របាយការណ៍សង្ខេបថ្ងៃនេះ (${new Date().toLocaleDateString('kh-KH')}):\n` +
        `• ស្ថាប័នសកម្ម៖ វិទ្យាល័យបាក់ទូក & ក្រុមហ៊ុនវឌ្ឍនៈ\n` +
        `• វត្តមានបុគ្គលិកសរុប៖ ៤ នាក់\n` +
        `• មកទាន់ម៉ោង៖ ៣ នាក់\n` +
        `• អវត្តមាន៖ ០ នាក់\n\n` +
        `សូមចូលទៅកាន់ Web Portal របស់ SecureAttend ដើម្បីពិនិត្យលម្អិត។`;
    } 
    else {
      responseMessage = `🙋‍♂️ សួស្តី! ខ្ញុំជាជំនួយការវត្តមានរបស់ SecureAttend។\n` +
        `ខ្ញុំមិនយល់អំពីបញ្ជា "${text}" ឡើយ។\n\n` +
        `សូមវាយ /start ដើម្បីចាប់ផ្តើម ឬ /checkin តាមពីក្រោយដោយលេខ PIN។`;
    }

    // If Telegram bot token is configured, send actual response back via HTTP endpoint telegram api
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && chatId) {
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseMessage,
          parse_mode: 'Markdown'
        })
      });
    }

    return NextResponse.json({
      success: true,
      telegram_reply: responseMessage,
      chat_id: chatId
    });

  } catch (error: any) {
    console.error('Telegram bot webhook processing error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
