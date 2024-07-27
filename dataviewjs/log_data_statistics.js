// 获取两天前日志文件名称
function getPreviewLog(days){
	const currentFileName = dv.current().file.name;
	const dateString = currentFileName.split('-').pop();
	const currentDate = new Date();
	const twoDaysAgoTime = new Date(currentDate.getTime() - (days * 24 * 60 * 60 * 1000));
	const year = twoDaysAgoTime.getFullYear();
	const month = (twoDaysAgoTime.getMonth() + 1).toString().padStart(2, '0'); 
	const day = twoDaysAgoTime.getDate().toString().padStart(2, '0');
	const twoDaysAgoString = year + month + day;
	return 'FM日志-' + twoDaysAgoString;
}

// 解析特定标题下的内容 
function getContentUnderHeading(content, heading) { 
	const regex = new RegExp(`# ${heading}\\n([\\s\\S]*?)(?=\\n# |$)`, 'g'); 
	const match = regex.exec(content); 
	return match ? match[1].trim() : `没有找到标题 # ${heading} 下的内容`; 
}

// 解析表格内容
function parseDeviceTable(content){
	const tableLines = content.split('\n').filter(line => line.startsWith('|')); 
	const rows = tableLines.slice(2).map(row => row.slice(1,-1).split('|').map(cell => cell.trim() === '' ? '' : cell.trim()) );
	return rows;
}

function filterDevice(rows,column){
	const devices = rows.filter(row => row[column].trim()==='Y');
	return devices.map(item => item[0]);
}

// 获取特定日志数据
async function getDayData(fileName){
	if(dv.page(fileName)){
		const content = await app.vault.readRaw(dv.page(fileName).file.path);
		const tableContent = getContentUnderHeading(content, 'TikTok账号数据');
		const rows = parseDeviceTable(tableContent);
		const resetCount = filterDevice(rows,1).length;
	 	const initCount = filterDevice(rows,3).length;
		const rightCount = filterDevice(rows,5).length;
		const kiloPlayCount = filterDevice(rows,7).length;
		return [resetCount, initCount, rightCount, kiloPlayCount];
	}
	else{
		return [0,0,0,0];
	}
}

// 获取重置列设备
async function getResetDevices(days){
	const filePath = dv.page(getPreviewLog(days)).file.path;
	const twoDaysAgoContent = await app.vault.readRaw(filePath);
	const tableContent = getContentUnderHeading(twoDaysAgoContent, 'TikTok账号数据');
	const rows = parseDeviceTable(tableContent);
	const resetDevices = filterDevice(rows,1);
	if(resetDevices){
		return resetDevices.join('、');
	}
	else{
		return '无';
	}
}

async function displayTodayData(allCount){
	//dv.header(6,'今日数据');
	const todayData = await getDayData(getPreviewLog(0));
	// 今日重置，初始发布，昨日重置，中视频账号，历史账号
	const restCount = allCount - todayData[0] - todayData[1] - todayData[2];

	const datas = [todayData[0],todayData[1],0,todayData[2],restCount];
	
	const yesterdayData = await getDayData(getPreviewLog(1));
	if(yesterdayData){
		datas[2] = yesterdayData[0];
		datas[4] = datas[4] - datas[2];
	}

	const devices = await getResetDevices(2);
	//dv.header(3,"今日应初始发布设备：" + devices);
	dv.paragraph("今日应初始发布设备：" + devices);
	// 渲染chart
	dv.paragraph(`\`\`\`chart
type: pie
labels: [今日重置,初始发布,昨日重置,中视频账号,其他历史账号]
series:
  - title: 
    data: [${datas}]
tension: 0.8
width: 70%
labelColors: true
fill: false
beginAtZero: false
bestFit: true
legendPosition: right
\`\`\``);
}

async function displaySomeDaysData(count){
	//dv.header(6,'历史数据');
	const days = [];
	const kiloPlayCounts = [];
	const resetCounts = [];
	const rightCounts = [];
	for(let i=count-1;i>=0;i--){
		const tmpName = getPreviewLog(i);
		const tmpData = await getDayData(tmpName);

		days.push(tmpName.replace('FM日志-',''));
		kiloPlayCounts.push(tmpData[3])
		resetCounts.push(tmpData[0]);
		rightCounts.push(tmpData[2]);
	}

	dv.paragraph(`\`\`\`chart
type: line
labels: [${days}]
series:
  - title: 千播
    data: [${kiloPlayCounts}]
  - title: 重置
    data: [${resetCounts}]
  - title: 中视频
    data: [${rightCounts}]
tension: 0.2
width: 100%
fill: true
beginAtZero: true
bestFit: false
bestFitTitle: undefined
bestFitNumber: 0
legendPosition: bottom
\`\`\``);
}

await displayTodayData(29);
await displaySomeDaysData(30);