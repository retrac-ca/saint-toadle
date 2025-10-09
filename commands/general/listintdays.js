// commands/general/listintdays.js

const days = require('../../data/international_days.json');

module.exports = {
  name: 'listintdays',
  description: 'List upcoming International Days',
  async execute(message) {
    try {
      const today = new Date();
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      const currentDay = String(today.getDate()).padStart(2, '0');
      const todayString = `${currentMonth}-${currentDay}`;

      // Get today's international days
      const todaysDays = days.filter(d => d.date === todayString);

      // Get next 10 upcoming days
      const upcomingDays = [];
      let checkDate = new Date(today);
      
      for (let i = 1; i <= 365 && upcomingDays.length < 10; i++) {
        checkDate.setDate(checkDate.getDate() + 1);
        const checkMonth = String(checkDate.getMonth() + 1).padStart(2, '0');
        const checkDay = String(checkDate.getDate()).padStart(2, '0');
        const checkString = `${checkMonth}-${checkDay}`;
        
        const matchingDays = days.filter(d => d.date === checkString);
        upcomingDays.push(...matchingDays);
      }

      let response = '🌐 **International Days**\n\n';

      // Today's days
      if (todaysDays.length > 0) {
        response += '**🎉 Today:**\n';
        todaysDays.forEach(day => {
          response += `• ${day.name}\n`;
        });
        response += '\n';
      }

      // Upcoming days
      if (upcomingDays.length > 0) {
        response += '**📅 Upcoming:**\n';
        upcomingDays.slice(0, 10).forEach(day => {
          const [month, dayNum] = day.date.split('-');
          response += `• ${month}/${dayNum} - ${day.name}\n`;
        });
      } else {
        response += '**📅 Upcoming:**\nNo upcoming days found in the next year.';
      }

      // If response is too long, split it
      if (response.length > 2000) {
        const parts = response.match(/.{1,1900}(?:\s|$)/g) || [response];
        for (const part of parts) {
          await message.reply(part);
        }
      } else {
        await message.reply(response);
      }

    } catch (error) {
      console.error('Error in listintdays command:', error);
      message.reply('❌ Failed to fetch international days list.');
    }
  }
};
