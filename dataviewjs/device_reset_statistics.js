// 获取指定天数前的日志文件名称
function getPreviewLog(days) {
    const currentDate = new Date();
    const targetDate = new Date(currentDate.getTime() - (days * 24 * 60 * 60 * 1000));
    const year = targetDate.getFullYear();
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const day = targetDate.getDate().toString().padStart(2, '0');
    const targetDateString = year + month + day;
    return 'FM日志-' + targetDateString;
}

// 解析特定标题下的内容
function getContentUnderHeading(content, heading) {
    const regex = new RegExp(`# ${heading}\\n([\\s\\S]*?)(?=\\n# |$)`, 'g');
    const match = regex.exec(content);
    return match ? match[1].trim() : `没有找到标题 # ${heading} 下的内容`;
}

// 解析表格内容
function parseDeviceTable(content) {
    const tableLines = content.split('\n').filter(line => line.startsWith('|'));
    const rows = tableLines.slice(2).map(row => row.slice(1, -1).split('|').map(cell => cell.trim() === '' ? '' : cell.trim()));
    return rows;
}

function filterDevice(rows, column) {
    const devices = rows.filter(row => row[column].trim() === 'Y');
    return devices.map(item => item[0]);
}

// 获取特定日志数据
async function getDayData(fileName) {
    if (dv.page(fileName)) {
        const content = await app.vault.readRaw(dv.page(fileName).file.path);
        const tableContent = getContentUnderHeading(content, 'TikTok账号数据');
        const rows = parseDeviceTable(tableContent);
        const resetDevices = filterDevice(rows, 1);
        return resetDevices;
    } else {
        return [];
    }
}

// 修改统计函数
async function get90DaysResetStatistics() {
    const deviceResetCount = {};
    const deviceResetCount60 = {};
    const deviceResetCount30 = {};
    const deviceLastResetDate = {};
    const currentDate = new Date();

    for (let i = 0; i < 90; i++) {
        const fileName = getPreviewLog(i);
        const resetDevices = await getDayData(fileName);
        const resetDate = fileName.replace('FM日志-', '');

        resetDevices.forEach(device => {
            deviceResetCount[device] = (deviceResetCount[device] || 0) + 1;
            if (i < 60) deviceResetCount60[device] = (deviceResetCount60[device] || 0) + 1;
            if (i < 30) deviceResetCount30[device] = (deviceResetCount30[device] || 0) + 1;
            if (!deviceLastResetDate[device] || resetDate > deviceLastResetDate[device]) {
                deviceLastResetDate[device] = resetDate;
            }
        });
    }

    return { deviceResetCount, deviceResetCount60, deviceResetCount30, deviceLastResetDate };
}

// 修改显示函数
async function display90DaysResetStatistics() {
    const { deviceResetCount, deviceResetCount60, deviceResetCount30, deviceLastResetDate } = await get90DaysResetStatistics();
    const devices = Object.keys(deviceResetCount);
    const currentDate = new Date();

    const tableHeader = '| 设备 | 90天重置 | 60天重置 | 30天重置 | 最后重置时间 | 距今天数 |\n| --- | --- | --- | --- | --- | --- |\n';
    let tableContent = '';

    devices.forEach(device => {
        const lastResetDate = new Date(deviceLastResetDate[device].replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        const daysSinceLastReset = Math.floor((currentDate - lastResetDate) / (1000 * 60 * 60 * 24));
        const resetCount90 = deviceResetCount[device];
        const resetCount90Cell = resetCount90 >= 10 ? `<span style="color: red;">${resetCount90}</span>` : resetCount90;
        const resetCount60 = deviceResetCount60[device] || 0;
        const resetCount60Cell = (resetCount90 < 10 && resetCount60 < 5) ? `<span style="color: green;">${resetCount60}</span>` : resetCount60;
        const resetCount30 = deviceResetCount30[device] || 0;
        const resetCount30Cell = (resetCount90 < 10 && resetCount30 < 5) ? `<span style="color: green;">${resetCount30}</span>` : resetCount30;
        const formattedLastResetDate = `${lastResetDate.getFullYear()}-${(lastResetDate.getMonth() + 1).toString().padStart(2, '0')}-${lastResetDate.getDate().toString().padStart(2, '0')}`;
        tableContent += `| ${device} | ${resetCount90Cell} | ${resetCount60Cell} | ${resetCount30Cell} | ${formattedLastResetDate} | ${daysSinceLastReset} |\n`;
    });

    dv.paragraph(tableHeader + tableContent);
}

await display90DaysResetStatistics();