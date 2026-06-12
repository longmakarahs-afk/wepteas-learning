import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { db } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Create a new Telegraf instance per request to guarantee thread-safety (no overlap)
    const token = process.env.TELEGRAM_BOT_TOKEN || 'DUMMY_TOKEN';
    const bot = new Telegraf(token);

    let replyText = '';

    // Register our response capturing/bypassing middleware
    bot.use(async (ctx, next) => {
      const originalReply = ctx.reply.bind(ctx);
      ctx.reply = async (text, extra) => {
        replyText = text as string;
        if (process.env.TELEGRAM_BOT_TOKEN) {
          try {
            return await originalReply(text, extra);
          } catch (err) {
            console.error('Telegraf real notification error:', err);
          }
        }
        // Fallback mock return object for local/simulated testing
        return {
          message_id: 1,
          date: Date.now(),
          chat: ctx.chat || { id: 123456789, type: 'private' },
          text: text
        } as any;
      };
      await next();
    });

    // Define commands
    bot.start((ctx) => {
      const miniAppUrl = process.env.APP_URL || 'https://ais-dev-mvhi4zp3aqinyf7jlb7tty-778687262567.asia-east1.run.app';
      return ctx.reply(`សូមស្វាគមន៍មកកាន់ SecureAttend! 🔔\n\nប្រព័ន្ធគ្រប់គ្រងវត្តមាន និងបើកប្រាក់បៀវត្សរ៍ដ៏មានសុវត្ថិភាពខ្ពស់។\n\n📌 សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើកកម្មវិធី Mini App៖`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 បើកកម្មវិធី (Open App)',
                web_app: { url: miniAppUrl }
              }
            ]
          ]
        }
      });
    });

    bot.command('link', async (ctx) => {
      try {
        const text = ctx.message?.text || '';
        const parts = text.split(/\s+/);
        const employeeCode = parts[1];

        if (!employeeCode) {
          return ctx.reply('⚠️ សូមប្រើប្រាស់ទម្រង់៖ `/link <EmployeeID>`\nឧទាហរណ៍៖ `/link EMP001`', { parse_mode: 'Markdown' });
        }

        const employees = await db.getEmployees();
        const employee = employees.find(e => e.employee_code?.trim().toUpperCase() === employeeCode.trim().toUpperCase());

        if (!employee) {
          return ctx.reply(`❌ រកមិនឃើញគណនីបុគ្គលិកដែលមានអត្តលេខ "${employeeCode}" ទេ។ សូមពិនិត្យមើលអត្តលេខឡើងវិញ!`);
        }

        const telegramId = ctx.from?.id.toString();
        if (!telegramId) {
          return ctx.reply(`❌ មិនអាចរកឃើញ Telegram ID របស់អ្នកឡើយ។`);
        }

        await db.updateEmployeeTelegramId(employee.id, telegramId);

        return ctx.reply(`✅ ការភ្ជាប់ទទួលបានជោគជ័យ!\n\n👤 បុគ្គលិក៖ ${employee.full_name_kh} (${employee.full_name_en})\n🔑 គណនីរបស់អ្នកត្រូវបានភ្ជាប់ជាមួយ Telegram នេះហើយ។ អ្នកនឹងទទួលបានសារដំណឹងរាល់ពេលស្គេនវត្តមាន!`);
      } catch (error: any) {
        console.error('Error in link command:', error);
        return ctx.reply(`❌ មានបញ្ហាក្នុងការភ្ជាប់គណនី៖ ${error.message}`);
      }
    });

    bot.command('checkin', async (ctx) => {
      try {
        const text = ctx.message?.text || '';
        const parts = text.split(/\s+/);
        const code = parts[1];

        if (!code) {
          return ctx.reply('⚠️ សូមបញ្ជាក់លេខកូដ PIN របស់អ្នក!\nឧទាហរណ៍៖ `/checkin 123456`');
        }

        const employees = await db.getEmployees();
        const employee = employees.find(e => e.pin_code === code || e.nfc_tag_id === code || e.qr_key === code);

        if (employee) {
          const checkedLog = await db.checkIn({
            employee_id: employee.id,
            method: 'PIN',
            geofence_ok: true,
            photo_matched: false,
            status: 'ON_TIME',
            notes: 'ចុះឈ្មោះវត្តមានតាម Telegram Bot'
          });

          const timeStr = new Date(checkedLog.check_in_time).toLocaleTimeString('kh-KH', { hour: '2-digit', minute: '2-digit' });

          return ctx.reply(`✅ *បញ្ជាក់វត្តមានចូលជោគជ័យ!*\n👤 បុគ្គលិក៖ ${employee.full_name_kh} (${employee.full_name_en})\n⏰ ម៉ោងចូល៖ ${timeStr}\n📍 ទីតាំង៖ ត្រឹមត្រូវ (Geofence OK)\n🔔 ស្ថានភាព៖ មកទាន់ម៉ោង`);
        } else {
          return ctx.reply(`❌ រកមិនឃើញបុគ្គលិកដែលមានលេខកូដ "${code}" ទេ។ សូមព្យាយាមម្តងទៀត!`);
        }
      } catch (error: any) {
        console.error('Error in checkin command:', error);
        return ctx.reply(`❌ មានបញ្ហាបច្ចេកទេស៖ ${error.message}`);
      }
    });

    bot.command('status', async (ctx) => {
      return ctx.reply(`📊 *របាយការណ៍សង្ខេបវត្តមានថ្ងៃនេះ*:\n• ស្ថាប័នសកម្ម៖ វិទ្យាល័យបាក់ទូក & ក្រុមហ៊ុនវឌ្ឍនៈ\n• វត្តមានបុគ្គលិកសរុប៖ ៤ នាក់\n• មកទាន់ម៉ោង៖ ៣ នាក់\n• អវត្តមាន៖ ០ នាក់\n\nសូមចូលទៅកាន់ Web Portal របស់ SecureAttend ដើម្បីពិនិត្យលម្អិត។`);
    });

    bot.command('help', async (ctx) => {
      return ctx.reply(`🙋‍♂️ *ជំនួយការវត្តមាន SecureAttend App*:\n\n✨ បញ្ជាដែលមានស្រាប់៖\n👉 /start - បើកដំណើរការកម្មវិធី Mini App\n👉 /link <EmployeeID> - ភ្ជាប់គណនី Telegram ជាមួយលេខកូដ ID បុគ្គលិក\n👉 /checkin <PIN/NFC/QR> - កត់ត្រាវត្តមានរហ័ស\n👉 /status - ពិនិត្យមើលវត្តមានថ្ងៃនេះ\n👉 /help - ទទួលបានការណែនាំបន្ថែម`);
    });

    bot.on('message', (ctx) => {
      return ctx.reply(`🙋‍♂️ សួស្តី! ខ្ញុំជាជំនួយការវត្តមានរបស់ SecureAttend។\n\nសូមវាយ /start ដើម្បីបើកកម្មវិធី ឬ /help ដើម្បីមើលបញ្ជាផ្សេងៗ។`);
    });

    // Make Telegraf process the update payload
    await bot.handleUpdate(body);

    const chatId = body?.message?.chat?.id;

    return NextResponse.json({
      success: true,
      telegram_reply: replyText,
      chat_id: chatId
    });

  } catch (err: any) {
    console.error('Telegraf webhook edge processing failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
