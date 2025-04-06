// Geographic Heatmap JavaScript Module
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map only if we're on the geoheatmap page
    if (document.getElementById('county-map')) {
        initializeMap();
        setupEventListeners();
    }
});

// Map and data variables
let map;
let countyLayer;
let markersLayer;
let countyData = {};
let countyPositions = {}; // 用于存储县的位置信息，用于客户标记
let currentMetric = 'revenue';
let currentIndustry = 'all';
let currentClientTypes = ['current', 'potential'];
let usCountiesData;
let userHasMovedMap = false; // Track if the user has manually moved the map

// Additional counties for North Carolina and other states
const ncCounties = [
    "Alamance", "Alexander", "Alleghany", "Anson", "Ashe", "Avery", "Beaufort", 
    "Bertie", "Bladen", "Brunswick", "Buncombe", "Burke", "Cabarrus", "Caldwell", 
    "Camden", "Carteret", "Caswell", "Catawba", "Chatham", "Cherokee", "Chowan", 
    "Clay", "Cleveland", "Columbus", "Craven", "Cumberland", "Currituck", "Dare", 
    "Davidson", "Davie", "Duplin", "Durham", "Edgecombe", "Forsyth", "Franklin", 
    "Gaston", "Gates", "Graham", "Granville", "Greene", "Guilford", "Halifax", 
    "Harnett", "Haywood", "Henderson", "Hertford", "Hoke", "Hyde", "Iredell", 
    "Jackson", "Johnston", "Jones", "Lee", "Lenoir", "Lincoln", "Macon", "Madison", 
    "Martin", "McDowell", "Mecklenburg", "Mitchell", "Montgomery", "Moore", "Nash", 
    "New Hanover", "Northampton", "Onslow", "Orange", "Pamlico", "Pasquotank", 
    "Pender", "Perquimans", "Person", "Pitt", "Polk", "Randolph", "Richmond", 
    "Robeson", "Rockingham", "Rowan", "Rutherford", "Sampson", "Scotland", "Stanly", 
    "Stokes", "Surry", "Swain", "Transylvania", "Tyrrell", "Union", "Vance", "Wake", 
    "Warren", "Washington", "Watauga", "Wayne", "Wilkes", "Wilson", "Yadkin", "Yancey"
];

// Comprehensive list of important counties across all 50 states
const otherImportantCounties = [
    // Alabama
    {"county": "Jefferson", "state": "Alabama"},
    {"county": "Mobile", "state": "Alabama"},
    {"county": "Madison", "state": "Alabama"},
    // Alaska
    {"county": "Anchorage", "state": "Alaska"},
    {"county": "Fairbanks North Star", "state": "Alaska"},
    {"county": "Matanuska-Susitna", "state": "Alaska"},
    // Arizona
    {"county": "Maricopa", "state": "Arizona"},
    {"county": "Pima", "state": "Arizona"},
    {"county": "Pinal", "state": "Arizona"},
    // Arkansas
    {"county": "Pulaski", "state": "Arkansas"},
    {"county": "Benton", "state": "Arkansas"},
    {"county": "Washington", "state": "Arkansas"},
    // California
    {"county": "Los Angeles", "state": "California"},
    {"county": "San Diego", "state": "California"},
    {"county": "Orange", "state": "California"},
    {"county": "Riverside", "state": "California"},
    {"county": "San Bernardino", "state": "California"},
    {"county": "Santa Clara", "state": "California"},
    {"county": "Alameda", "state": "California"},
    {"county": "Sacramento", "state": "California"},
    {"county": "Contra Costa", "state": "California"},
    {"county": "Fresno", "state": "California"},
    {"county": "San Francisco", "state": "California"},
    {"county": "Ventura", "state": "California"},
    {"county": "San Mateo", "state": "California"},
    // Colorado
    {"county": "Denver", "state": "Colorado"},
    {"county": "El Paso", "state": "Colorado"},
    {"county": "Arapahoe", "state": "Colorado"},
    {"county": "Jefferson", "state": "Colorado"},
    {"county": "Adams", "state": "Colorado"},
    // Connecticut
    {"county": "Fairfield", "state": "Connecticut"},
    {"county": "Hartford", "state": "Connecticut"},
    {"county": "New Haven", "state": "Connecticut"},
    // Delaware
    {"county": "New Castle", "state": "Delaware"},
    {"county": "Sussex", "state": "Delaware"},
    {"county": "Kent", "state": "Delaware"},
    // Florida
    {"county": "Miami-Dade", "state": "Florida"},
    {"county": "Broward", "state": "Florida"},
    {"county": "Palm Beach", "state": "Florida"},
    {"county": "Hillsborough", "state": "Florida"},
    {"county": "Orange", "state": "Florida"},
    {"county": "Pinellas", "state": "Florida"},
    {"county": "Duval", "state": "Florida"},
    {"county": "Lee", "state": "Florida"},
    // Georgia
    {"county": "Fulton", "state": "Georgia"},
    {"county": "Gwinnett", "state": "Georgia"},
    {"county": "Cobb", "state": "Georgia"},
    {"county": "DeKalb", "state": "Georgia"},
    // Hawaii
    {"county": "Honolulu", "state": "Hawaii"},
    {"county": "Maui", "state": "Hawaii"},
    {"county": "Hawaii", "state": "Hawaii"},
    // Idaho
    {"county": "Ada", "state": "Idaho"},
    {"county": "Canyon", "state": "Idaho"},
    {"county": "Kootenai", "state": "Idaho"},
    // Illinois
    {"county": "Cook", "state": "Illinois"},
    {"county": "DuPage", "state": "Illinois"},
    {"county": "Lake", "state": "Illinois"},
    {"county": "Will", "state": "Illinois"},
    // Indiana
    {"county": "Marion", "state": "Indiana"},
    {"county": "Lake", "state": "Indiana"},
    {"county": "Allen", "state": "Indiana"},
    {"county": "Hamilton", "state": "Indiana"},
    // Iowa
    {"county": "Polk", "state": "Iowa"},
    {"county": "Linn", "state": "Iowa"},
    {"county": "Scott", "state": "Iowa"},
    // Kansas
    {"county": "Johnson", "state": "Kansas"},
    {"county": "Sedgwick", "state": "Kansas"},
    {"county": "Shawnee", "state": "Kansas"},
    // Kentucky
    {"county": "Jefferson", "state": "Kentucky"},
    {"county": "Fayette", "state": "Kentucky"},
    {"county": "Kenton", "state": "Kentucky"},
    // Louisiana
    {"county": "East Baton Rouge", "state": "Louisiana"},
    {"county": "Jefferson", "state": "Louisiana"},
    {"county": "Orleans", "state": "Louisiana"},
    // Maine
    {"county": "Cumberland", "state": "Maine"},
    {"county": "York", "state": "Maine"},
    {"county": "Penobscot", "state": "Maine"},
    // Maryland
    {"county": "Montgomery", "state": "Maryland"},
    {"county": "Prince George's", "state": "Maryland"},
    {"county": "Baltimore", "state": "Maryland"},
    // Massachusetts
    {"county": "Middlesex", "state": "Massachusetts"},
    {"county": "Suffolk", "state": "Massachusetts"},
    {"county": "Essex", "state": "Massachusetts"},
    {"county": "Worcester", "state": "Massachusetts"},
    // Michigan
    {"county": "Wayne", "state": "Michigan"},
    {"county": "Oakland", "state": "Michigan"},
    {"county": "Macomb", "state": "Michigan"},
    {"county": "Kent", "state": "Michigan"},
    // Minnesota
    {"county": "Hennepin", "state": "Minnesota"},
    {"county": "Ramsey", "state": "Minnesota"},
    {"county": "Dakota", "state": "Minnesota"},
    // Mississippi
    {"county": "Hinds", "state": "Mississippi"},
    {"county": "Harrison", "state": "Mississippi"},
    {"county": "DeSoto", "state": "Mississippi"},
    // Missouri
    {"county": "St. Louis", "state": "Missouri"},
    {"county": "Jackson", "state": "Missouri"},
    {"county": "St. Charles", "state": "Missouri"},
    // Montana
    {"county": "Yellowstone", "state": "Montana"},
    {"county": "Missoula", "state": "Montana"},
    {"county": "Gallatin", "state": "Montana"},
    // Nebraska
    {"county": "Douglas", "state": "Nebraska"},
    {"county": "Lancaster", "state": "Nebraska"},
    {"county": "Sarpy", "state": "Nebraska"},
    // Nevada
    {"county": "Clark", "state": "Nevada"},
    {"county": "Washoe", "state": "Nevada"},
    {"county": "Carson City", "state": "Nevada"},
    // New Hampshire
    {"county": "Hillsborough", "state": "New Hampshire"},
    {"county": "Rockingham", "state": "New Hampshire"},
    {"county": "Merrimack", "state": "New Hampshire"},
    // New Jersey
    {"county": "Bergen", "state": "New Jersey"},
    {"county": "Middlesex", "state": "New Jersey"},
    {"county": "Essex", "state": "New Jersey"},
    {"county": "Hudson", "state": "New Jersey"},
    // New Mexico
    {"county": "Bernalillo", "state": "New Mexico"},
    {"county": "Doña Ana", "state": "New Mexico"},
    {"county": "Santa Fe", "state": "New Mexico"},
    // New York
    {"county": "Kings", "state": "New York"},
    {"county": "Queens", "state": "New York"},
    {"county": "New York", "state": "New York"},
    {"county": "Suffolk", "state": "New York"},
    {"county": "Bronx", "state": "New York"},
    {"county": "Nassau", "state": "New York"},
    {"county": "Westchester", "state": "New York"},
    {"county": "Erie", "state": "New York"},
    {"county": "Monroe", "state": "New York"},
    // North Carolina - already covered by ncCounties array
    // North Dakota
    {"county": "Cass", "state": "North Dakota"},
    {"county": "Burleigh", "state": "North Dakota"},
    {"county": "Grand Forks", "state": "North Dakota"},
    // Ohio
    {"county": "Franklin", "state": "Ohio"},
    {"county": "Cuyahoga", "state": "Ohio"},
    {"county": "Hamilton", "state": "Ohio"},
    {"county": "Summit", "state": "Ohio"},
    {"county": "Montgomery", "state": "Ohio"},
    // Oklahoma
    {"county": "Oklahoma", "state": "Oklahoma"},
    {"county": "Tulsa", "state": "Oklahoma"},
    {"county": "Cleveland", "state": "Oklahoma"},
    // Oregon
    {"county": "Multnomah", "state": "Oregon"},
    {"county": "Washington", "state": "Oregon"},
    {"county": "Clackamas", "state": "Oregon"},
    // Pennsylvania
    {"county": "Philadelphia", "state": "Pennsylvania"},
    {"county": "Allegheny", "state": "Pennsylvania"},
    {"county": "Montgomery", "state": "Pennsylvania"},
    {"county": "Bucks", "state": "Pennsylvania"},
    // Rhode Island
    {"county": "Providence", "state": "Rhode Island"},
    {"county": "Kent", "state": "Rhode Island"},
    {"county": "Washington", "state": "Rhode Island"},
    // South Carolina
    {"county": "Greenville", "state": "South Carolina"},
    {"county": "Richland", "state": "South Carolina"},
    {"county": "Charleston", "state": "South Carolina"},
    // South Dakota
    {"county": "Minnehaha", "state": "South Dakota"},
    {"county": "Pennington", "state": "South Dakota"},
    {"county": "Lincoln", "state": "South Dakota"},
    // Tennessee
    {"county": "Shelby", "state": "Tennessee"},
    {"county": "Davidson", "state": "Tennessee"},
    {"county": "Knox", "state": "Tennessee"},
    {"county": "Hamilton", "state": "Tennessee"},
    // Texas
    {"county": "Harris", "state": "Texas"},
    {"county": "Dallas", "state": "Texas"},
    {"county": "Tarrant", "state": "Texas"},
    {"county": "Bexar", "state": "Texas"},
    {"county": "Travis", "state": "Texas"},
    {"county": "Collin", "state": "Texas"},
    {"county": "Denton", "state": "Texas"},
    {"county": "El Paso", "state": "Texas"},
    {"county": "Fort Bend", "state": "Texas"},
    {"county": "Hidalgo", "state": "Texas"},
    // Utah
    {"county": "Salt Lake", "state": "Utah"},
    {"county": "Utah", "state": "Utah"},
    {"county": "Davis", "state": "Utah"},
    // Vermont
    {"county": "Chittenden", "state": "Vermont"},
    {"county": "Washington", "state": "Vermont"},
    {"county": "Rutland", "state": "Vermont"},
    // Virginia
    {"county": "Fairfax", "state": "Virginia"},
    {"county": "Prince William", "state": "Virginia"},
    {"county": "Loudoun", "state": "Virginia"},
    {"county": "Virginia Beach", "state": "Virginia"},
    // Washington
    {"county": "King", "state": "Washington"},
    {"county": "Pierce", "state": "Washington"},
    {"county": "Snohomish", "state": "Washington"},
    {"county": "Spokane", "state": "Washington"},
    // West Virginia
    {"county": "Kanawha", "state": "West Virginia"},
    {"county": "Berkeley", "state": "West Virginia"},
    {"county": "Cabell", "state": "West Virginia"},
    // Wisconsin
    {"county": "Milwaukee", "state": "Wisconsin"},
    {"county": "Dane", "state": "Wisconsin"},
    {"county": "Waukesha", "state": "Wisconsin"},
    // Wyoming
    {"county": "Laramie", "state": "Wyoming"},
    {"county": "Natrona", "state": "Wyoming"},
    {"county": "Campbell", "state": "Wyoming"}
];

// Initialize the map
function initializeMap() {
    // Create a Leaflet map - Set initial view to show entire US
    map = L.map('county-map').setView([39.8, -98.5], 4); // Center on the US initially
    
    // Track map movement by user
    map.on('dragend', function() {
        userHasMovedMap = true;
    });
    
    map.on('zoomend', function() {
        userHasMovedMap = true;
    });
    
    // Add a light basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Create a layer for client markers
    markersLayer = L.layerGroup().addTo(map);
    
    // 添加风险等级图例
    addRiskLegend();
    
    // Load US counties GeoJSON data
    fetch('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json')
        .then(response => response.json())
        .then(data => {
            usCountiesData = data;
            // 存储县数据后加载实际数据
            console.log("Successfully loaded county GeoJSON data");
            refreshCountyData();
        })
        .catch(error => {
            console.error('Error loading county data:', error);
            showErrorNotification('Failed to load county map data. Using local data instead.');
            
            // 使用备用方法加载县数据
            fallbackLoadCountyData();
        });
}

// Setup event listeners for UI controls
function setupEventListeners() {
    // Metric radio buttons
    document.querySelectorAll('input[name="metric"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentMetric = this.value;
            updateMap(false); // Don't reposition the map when changing metrics
        });
    });
    
    // Industry filter dropdown
    document.getElementById('industry-filter').addEventListener('change', function() {
        currentIndustry = this.value;
        refreshCountyData();
    });
    
    // Client type checkboxes
    document.querySelectorAll('input[name="client-type"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Update the client types array
            currentClientTypes = [];
            
            // Get all checked client type checkboxes
            document.querySelectorAll('input[name="client-type"]:checked').forEach(checked => {
                currentClientTypes.push(checked.value);
            });
            
            // Refresh data to update the map
            refreshCountyData();
        });
    });
}

// Fetch county data from the API based on current filters
function refreshCountyData() {
    showLoading();
    
    // Prepare URL and parameters
    const url = new URL(`${window.location.origin}/api/county_data`);
    url.searchParams.append('industry', currentIndustry);
    url.searchParams.append('metric', currentMetric);
    
    // Only append client_type if array is not empty
    if (currentClientTypes.length > 0) {
        currentClientTypes.forEach(type => {
            url.searchParams.append('client_type', type);
        });
    }
    
    // 解决API连接问题：预先检测API是否可用
    fetch(`${window.location.origin}/api/ping`, { method: 'GET', timeout: 2000 })
        .then(response => {
            if (response.ok) {
                // API可用，继续正常的数据获取
                fetchActualData();
            } else {
                // API响应不正常，使用模拟数据
                useSimulatedData("API responded with an error. Using simulated data instead.");
            }
        })
        .catch(error => {
            // 无法连接到API，使用模拟数据
            useSimulatedData("Failed to connect to the server. Using simulated data instead.");
        });
    
    // 实际从API获取数据的函数
    function fetchActualData() {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    countyData = data.counties;
                    updateMap(true); // Allow initial repositioning for industry changes
                } else {
                    console.error('Error fetching county data:', data.message);
                    // 显示错误通知，使用模拟数据
                    useSimulatedData(data.message || 'Failed to load map data. Using simulated data instead.');
                }
            })
            .catch(error => {
                console.error('Error fetching county data:', error);
                // 显示错误通知，使用模拟数据
                useSimulatedData('Failed to connect to the server. Using simulated data instead.');
            })
            .finally(() => {
                hideLoading();
            });
    }
    
    // 使用模拟数据的函数
    function useSimulatedData(message) {
        showErrorNotification(message);
        console.log("Using simulated data for map display");
        simulateCountyData();
        updateMap(true);
        hideLoading();
    }
}

// Simulate more county data to improve coverage
function simulateMoreCountyData() {
    // Process the GeoJSON data to generate data for more counties
    if (!usCountiesData || !usCountiesData.features) return;
    
    // 性能优化：对GeoJSON数据进行抽样，只处理一部分特征
    // 这可以显著减少处理时间
    const countiesToProcess = Math.min(usCountiesData.features.length, 1000);
    const samplingRate = Math.floor(usCountiesData.features.length / countiesToProcess);
    const stateCounts = {};
    
    // 优化处理过程
    for (let i = 0; i < usCountiesData.features.length; i += samplingRate) {
        const feature = usCountiesData.features[i];
        const county = feature.properties.NAME;
        const state = getStateFromFips(feature.properties.STATE);
        const countyKey = `${county}, ${state}`;
        
        // Skip if we already have data for this county
        if (countyData[countyKey]) continue;
        
        // Track how many counties we've added per state
        if (!stateCounts[state]) stateCounts[state] = 0;
        stateCounts[state]++;
        
        // 大幅减少每个州添加的县数量，只添加最多15个
        if (stateCounts[state] > 15) continue;
        
        // Generate simple data for this county with fewer companies
        countyData[countyKey] = createSimulatedCountyData(county, state, 
            Math.floor(Math.random() * 5) + 3); // 减少公司数量到3-7个
    }
}

// Simulate county data for testing
function simulateCountyData() {
    console.log("Generating simulated county data...");
    countyData = {}; // 清空当前数据，确保没有旧数据干扰
    const simulatedCounties = {};
    
    // Add all North Carolina counties
    ncCounties.forEach(county => {
        simulatedCounties[`${county}, North Carolina`] = createSimulatedCountyData(county, 'North Carolina', 
            Math.floor(Math.random() * 3) + 1); // 1-3个公司
    });
    
    // Add important counties from each state (只使用一部分重要县，确保每个州至少有1个)
    // 创建一个州到县的映射
    const stateCountyMap = {};
    
    otherImportantCounties.forEach(item => {
        if (!stateCountyMap[item.state]) {
            stateCountyMap[item.state] = [];
        }
        stateCountyMap[item.state].push(item);
    });
    
    // 对于每个州，只添加最多3个重要县
    Object.values(stateCountyMap).forEach(counties => {
        // 如果一个州有多个县，只选择最多3个
        const countiesToAdd = counties.slice(0, 3);
        countiesToAdd.forEach(item => {
            simulatedCounties[`${item.county}, ${item.state}`] = createSimulatedCountyData(
                item.county, item.state, Math.floor(Math.random() * 3) + 1); // 1-3个公司
        });
    });
    
    // 更新全局县数据对象
    countyData = simulatedCounties;
    console.log(`Generated data for ${Object.keys(countyData).length} counties`);
}

// 优化公司数据生成函数，减少每个县的数据量
function createSimulatedCountyData(county, state, companyCount) {
    // 限制每个县的公司数量上限为3个
    companyCount = Math.min(companyCount, 3);
    
    // Adjust company count to ensure we have enough data points
    companyCount = Math.max(companyCount, 1); // 确保至少1个公司
    
    // 更平均地分配风险级别，确保每种风险级别的地区数量更均衡
    let highRisk, mediumRisk, lowRisk;
    
    // 使用更确定的分配方式来分配风险，确保更均匀的分布
    // 使用州名和县名的组合来确定风险级别
    const combinedName = state + county;
    const hashValue = combinedName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // 将所有县分成三组，确保高/中/低风险区域完全均匀分布
    const riskGroup = hashValue % 3;
    
    if (riskGroup === 0) {
        // 高风险区域 - 33%的州县组合
        highRisk = companyCount;
        mediumRisk = 0;
        lowRisk = 0;
    } else if (riskGroup === 1) {
        // 中等风险区域 - 33%的州县组合
        highRisk = 0;
        mediumRisk = companyCount;
        lowRisk = 0;
    } else {
        // 低风险区域 - 33%的州县组合
        highRisk = 0;
        mediumRisk = 0;
        lowRisk = companyCount;
    }
    
    // Generate random client distribution
    const currentClients = Math.floor(companyCount * 0.5); // 当前客户占50%
    const potentialClients = companyCount - currentClients;
    
    // 简化公司生成过程
    const companies = [];
    const industries = ['Healthcare', 'Technology', 'Banking', 'Other'];
    
    // 使用更简单的逻辑添加公司
    let companyIndex = 0;
    
    // 添加高风险公司
    for (let i = 0; i < highRisk; i++) {
        const isClient = companyIndex < currentClients;
        const clientType = isClient ? 'current' : 'potential';
        
        if (currentClientTypes.includes(clientType)) {
            companies.push({
                name: `Company ${companyIndex+1} in ${county}`,
                industry: industries[companyIndex % industries.length],
                risk_level: 'high',
                is_client: isClient
            });
        }
        companyIndex++;
    }
    
    // 添加中等风险公司
    for (let i = 0; i < mediumRisk; i++) {
        const isClient = companyIndex < currentClients;
        const clientType = isClient ? 'current' : 'potential';
        
        if (currentClientTypes.includes(clientType)) {
            companies.push({
                name: `Company ${companyIndex+1} in ${county}`,
                industry: industries[companyIndex % industries.length],
                risk_level: 'medium',
                is_client: isClient
            });
        }
        companyIndex++;
    }
    
    // 添加低风险公司
    for (let i = 0; i < lowRisk; i++) {
        const isClient = companyIndex < currentClients;
        const clientType = isClient ? 'current' : 'potential';
        
        if (currentClientTypes.includes(clientType)) {
            companies.push({
                name: `Company ${companyIndex+1} in ${county}`,
                industry: industries[companyIndex % industries.length],
                risk_level: 'low',
                is_client: isClient
            });
        }
        companyIndex++;
    }
    
    // Live Oak Bank特例
    if (county === 'New Hanover' && state === 'North Carolina') {
        companies.unshift({
            name: 'Live Oak Bank',
            industry: 'Banking',
            risk_level: 'low',
            is_client: true
        });
    }
    
    // 基于风险组确定县的主导风险级别
    let dominantRisk;
    if (riskGroup === 0) {
        dominantRisk = 'high';
    } else if (riskGroup === 1) {
        dominantRisk = 'medium';
    } else {
        dominantRisk = 'low';
    }
    
    // 根据主导风险设置指标
    let revenue, pd, fcr, cr;
    
    if (dominantRisk === 'high') {
        revenue = 10000000 + (state.length * 1000000);
        pd = 0.08;
        fcr = 0.8;
        cr = 0.9;
    } else if (dominantRisk === 'medium') {
        revenue = 25000000 + (state.length * 1000000);
        pd = 0.03;
        fcr = 1.5;
        cr = 1.5;
    } else {
        revenue = 50000000 + (state.length * 1000000);
        pd = 0.005;
        fcr = 2.5;
        cr = 2.5;
    }
    
    // 为北卡罗来纳州提高指标
    if (state === 'North Carolina') {
        revenue *= 1.25;
        pd *= 0.8;
        fcr *= 1.2;
        cr *= 1.2;
    }
    
    // New Hanover特例
    if (county === 'New Hanover' && state === 'North Carolina') {
        revenue *= 1.5;
        pd *= 0.6;
        fcr *= 1.5;
        cr *= 1.5;
    }
    
    return {
        county: county,
        state: state,
        companies: companies,
        revenue_total: revenue,
        pd_avg: pd,
        fcr_avg: fcr,
        cr_avg: cr,
        risk_counts: {
            high: highRisk,
            medium: mediumRisk,
            low: lowRisk
        },
        client_counts: {
            current: currentClientTypes.includes('current') ? currentClients : 0,
            potential: currentClientTypes.includes('potential') ? potentialClients : 0
        },
        dominant_risk: dominantRisk
    };
}

// Format utilities
function formatCurrency(value) {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        maximumFractionDigits: 0
    }).format(value);
}

function formatPercent(value) {
    if (value === undefined || value === null) return 'N/A';
    return (value * 100).toFixed(2);
}

function formatDecimal(value) {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(2);
}

function formatRiskLevel(risk) {
    if (!risk) return 'N/A';
    return risk.charAt(0).toUpperCase() + risk.slice(1);
}

// Show an error notification on the page
function showErrorNotification(message) {
    // 创建通知容器（如果不存在）
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'alert alert-warning';
    notification.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span class="message">${message}</span>
        <button class="close-btn"><i class="fas fa-times"></i></button>
    `;
    
    // 添加关闭按钮功能
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        notification.remove();
    });
    
    // 添加通知到容器
    notificationContainer.appendChild(notification);
    
    // 添加动画样式
    setTimeout(function() {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // 10秒后自动移除通知
    setTimeout(function() {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(function() {
            try {
                notification.remove();
            } catch (e) {
                // Handle case where notification was already removed
            }
        }, 300);
    }, 10000);
}

// Add a client marker to the map
function addClientMarkers(countyKey, metrics) {
    // 如果没有公司数据，跳过
    if (!metrics || !metrics.companies || metrics.companies.length === 0) return;
    
    // 获取县的位置
    if (!countyPositions[countyKey]) return;
    
    const position = countyPositions[countyKey];
    const companies = metrics.companies;
    
    // 确保公司显示顺序与风险级别一致
    companies.sort((a, b) => {
        // 根据风险级别优先显示，高>中>低
        const riskOrder = {'high': 0, 'medium': 1, 'low': 2};
        return riskOrder[a.risk_level] - riskOrder[b.risk_level];
    });
    
    // 对每个公司创建标记
    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        
        // 跳过不符合筛选条件的客户类型
        const clientType = company.is_client ? 'current' : 'potential';
        if (!currentClientTypes.includes(clientType)) continue;
        
        // 确定标记颜色
        let markerColor;
        // 使用与侧边栏匹配的颜色
        if (clientType === 'current') {
            markerColor = '#4285f4'; // 蓝色 - 当前客户
        } else {
            markerColor = '#34a853'; // 绿色 - 潜在客户
        }
        
        // 创建自定义图标
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        // 创建标记并添加点击事件
        const marker = L.marker([position.lat + (Math.random() * 0.1 - 0.05), position.lng + (Math.random() * 0.1 - 0.05)], {
            icon: icon
        }).addTo(markersLayer);
        
        // 添加点击事件以显示公司信息
        marker.bindPopup(`
            <div class="company-popup">
                <h3>${company.name}</h3>
                <p><strong>Industry:</strong> ${company.industry}</p>
                <p><strong>Risk Level:</strong> <span style="color: ${getRiskColor(company.risk_level)}; font-weight: bold;">${company.risk_level.toUpperCase()}</span></p>
                <p><strong>Client Status:</strong> ${company.is_client ? 'Current Client' : 'Potential Client'}</p>
            </div>
        `);
    }
}

// 根据风险级别返回颜色
function getRiskColor(riskLevel) {
    if (riskLevel === 'high') {
        return '#ff5252'; // 红色 - 高风险
    } else if (riskLevel === 'medium') {
        return '#ffce56'; // 黄色 - 中风险
    } else {
        return '#4caf50'; // 绿色 - 低风险
    }
}

// Helper function to get the state name from FIPS code
function getStateFromFips(fips) {
    const states = {
        '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
        '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
        '11': 'District of Columbia', '12': 'Florida', '13': 'Georgia', '15': 'Hawaii',
        '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
        '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
        '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
        '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska',
        '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico',
        '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
        '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
        '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas',
        '49': 'Utah', '50': 'Vermont', '51': 'Virginia', '53': 'Washington',
        '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming'
    };
    
    return states[fips] || 'Unknown';
}

// Get color for county based on metric and value
function getCountyColor(metrics, metric) {
    if (!metrics) return '#e0e0e0'; // Default color for counties without data
    
    // 基于主导风险级别确定颜色
    const dominantRisk = metrics.dominant_risk;
    
    if (dominantRisk === 'high') {
        return '#ff5252'; // 红色 - 高风险区域
    } else if (dominantRisk === 'medium') {
        return '#ffce56'; // 黄色 - 中风险区域
    } else {
        return '#4caf50'; // 绿色 - 低风险区域
    }
}

// Show tooltip with county information
function showTooltip(event, county, state, metrics) {
    const tooltip = document.getElementById('map-tooltip');
    tooltip.style.display = 'block';
    
    // Update tooltip position
    updateTooltipPosition(event);
    
    // Update tooltip content
    document.querySelector('.tooltip-county').textContent = county;
    document.getElementById('tooltip-state').textContent = state;
    
    if (metrics) {
        document.getElementById('tooltip-revenue').textContent = formatCurrency(metrics.revenue_total);
        document.getElementById('tooltip-pd').textContent = formatPercent(metrics.pd_avg);
        document.getElementById('tooltip-fcr').textContent = formatDecimal(metrics.fcr_avg);
        document.getElementById('tooltip-cr').textContent = formatDecimal(metrics.cr_avg);
        document.getElementById('tooltip-risk').textContent = formatRiskLevel(metrics.dominant_risk);
        
        // Format client information
        const currentClients = metrics.client_counts.current;
        const potentialClients = metrics.client_counts.potential;
        document.getElementById('tooltip-clients').textContent = `${currentClients} current, ${potentialClients} potential`;
    } else {
        document.getElementById('tooltip-revenue').textContent = 'N/A';
        document.getElementById('tooltip-pd').textContent = 'N/A';
        document.getElementById('tooltip-fcr').textContent = 'N/A';
        document.getElementById('tooltip-cr').textContent = 'N/A';
        document.getElementById('tooltip-risk').textContent = 'N/A';
        document.getElementById('tooltip-clients').textContent = 'N/A';
    }
}

// Hide the tooltip
function hideTooltip() {
    document.getElementById('map-tooltip').style.display = 'none';
}

// Update tooltip position
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('map-tooltip');
    const offset = 10; // Offset from cursor
    
    // Get Map container dimensions
    const mapContainer = document.getElementById('county-map');
    const mapRect = mapContainer.getBoundingClientRect();
    
    // Calculate position relative to the map container
    const relativeX = event.clientX - mapRect.left;
    const relativeY = event.clientY - mapRect.top;
    
    // Get size of the tooltip
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    // Initialize position
    let leftPos, topPos;
    
    // Check if tooltip would go outside the map on the right
    if (relativeX + tooltipWidth + offset > mapRect.width) {
        leftPos = relativeX - tooltipWidth - offset;
    } else {
        leftPos = relativeX + offset;
    }
    
    // Check if tooltip would go outside the map on the bottom
    if (relativeY + tooltipHeight + offset > mapRect.height) {
        topPos = relativeY - tooltipHeight - offset;
    } else {
        topPos = relativeY + offset;
    }
    
    // Ensure tooltip doesn't go outside map on the left or top
    leftPos = Math.max(leftPos, 0);
    topPos = Math.max(topPos, 0);
    
    // Position the tooltip relative to the map container
    tooltip.style.left = leftPos + 'px';
    tooltip.style.top = topPos + 'px';
}

// Show loading overlay
function showLoading() {
    // Check if a loading overlay exists, otherwise create one
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-circle-notch fa-spin"></i>
                <span>Loading map data...</span>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// 添加风险等级图例
function addRiskLegend() {
    // 创建图例控件
    const legend = L.control({position: 'bottomright'});
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        
        // 添加图例标题
        div.innerHTML = '<h4>Risk Level</h4>';
        
        // 添加图例项
        div.innerHTML += 
            '<div class="legend-item"><i style="background:#4caf50"></i> Low Risk (Green)</div>' +
            '<div class="legend-item"><i style="background:#ffce56"></i> Medium Risk (Yellow)</div>' +
            '<div class="legend-item"><i style="background:#ff5252"></i> High Risk (Red)</div>';
            
        // 添加基本样式
        div.style.padding = '10px';
        div.style.background = 'rgba(255, 255, 255, 0.9)';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.2)';
        div.style.lineHeight = '1.5';
        
        // 设置图例项样式
        const items = div.getElementsByClassName('legend-item');
        for (let i = 0; i < items.length; i++) {
            items[i].style.marginBottom = '5px';
            items[i].style.display = 'flex';
            items[i].style.alignItems = 'center';
        }
        
        // 设置颜色标记样式
        const colorMarkers = div.getElementsByTagName('i');
        for (let i = 0; i < colorMarkers.length; i++) {
            colorMarkers[i].style.width = '18px';
            colorMarkers[i].style.height = '18px';
            colorMarkers[i].style.display = 'inline-block';
            colorMarkers[i].style.marginRight = '8px';
            colorMarkers[i].style.borderRadius = '3px';
        }
        
        return div;
    };
    
    legend.addTo(map);
}

// Update the map with the current data
function updateMap(allowReposition = false) {
    // If we already have a layer, remove it
    if (countyLayer) {
        map.removeLayer(countyLayer);
    }
    
    // Clear all client markers
    markersLayer.clearLayers();
    
    // If we don't have usCountiesData yet, exit early
    if (!usCountiesData) {
        console.error("No counties GeoJSON data available");
        return;
    }
    
    // Count counties with data to check coverage
    let countiesWithData = 0;
    let totalCounties = 0;
    
    // Create a new GeoJSON layer with the data
    countyLayer = L.geoJSON(usCountiesData, {
        style: function(feature) {
            totalCounties++;
            const county = feature.properties.NAME;
            const state = getStateFromFips(feature.properties.STATE);
            const countyKey = `${county}, ${state}`;
            const metrics = countyData[countyKey];
            
            // If this county has data, increment our counter
            if (metrics) {
                countiesWithData++;
            }
            
            return {
                fillColor: getCountyColor(metrics, currentMetric),
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            const county = feature.properties.NAME;
            const state = getStateFromFips(feature.properties.STATE);
            const countyKey = `${county}, ${state}`;
            const metrics = countyData[countyKey];
            
            // Track county positions for client markers
            if (!countyPositions[countyKey] && metrics) {
                // Use the centroid of the county polygon
                const bounds = layer.getBounds();
                countyPositions[countyKey] = bounds.getCenter();
            }
            
            // Add tooltip on hover
            layer.on({
                mouseover: function(e) {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 2,
                        color: '#666',
                        fillOpacity: 0.9
                    });
                    
                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        layer.bringToFront();
                    }
                    
                    showTooltip(e.originalEvent, county, state, metrics);
                },
                mouseout: function(e) {
                    countyLayer.resetStyle(e.target);
                    hideTooltip();
                },
                mousemove: function(e) {
                    updateTooltipPosition(e.originalEvent);
                },
                click: function(e) {
                    // Zoom to county on click
                    map.fitBounds(e.target.getBounds());
                    userHasMovedMap = true; // Set flag when user clicks on a county
                }
            });
            
            // Add client markers if any
            if (metrics && metrics.companies) {
                addClientMarkers(countyKey, metrics);
            }
        }
    }).addTo(map);
    
    // Check coverage stats
    console.log(`Counties with data: ${countiesWithData} out of ${totalCounties} (${Math.round(countiesWithData/totalCounties*100)}% coverage)`);
    
    // Generate more data if coverage is too low
    if (countiesWithData / totalCounties < 0.15) {
        console.log("Generating additional county data for better map coverage");
        // Use requestAnimationFrame to avoid blocking UI
        requestAnimationFrame(() => {
            simulateMoreCountyData();
            requestAnimationFrame(() => updateMap(allowReposition));
        });
        return;
    }
    
    // Only reposition map if allowed and user hasn't manually moved it
    if (allowReposition && !userHasMovedMap) {
        // If North Carolina filter is selected, zoom to NC
        if (currentIndustry === 'banking' || currentIndustry === 'finance') {
            // If banking industry is selected, focus on North Carolina
            map.setView([35.5, -80], 6);
        } else {
            map.setView([39.8, -98.5], 4); // Default to whole US view
        }
    }
}

// 备用方法，用于在无法从GitHub加载数据时
function fallbackLoadCountyData() {
    // 显示模拟数据的通知
    showErrorNotification("Using simulated data for demonstration. Real data connection unavailable.");
    
    console.log("Falling back to simplified county map data");
    
    // 创建一个极简版的县数据结构，包含主要的北卡罗来纳县
    const simplifiedCounties = [];
    
    // 添加北卡罗来纳州的几个主要县作为示例
    const mainCounties = [
        { name: "New Hanover", state: "North Carolina", lat: 34.2104, lng: -77.8868 },
        { name: "Mecklenburg", state: "North Carolina", lat: 35.2468, lng: -80.8325 },
        { name: "Wake", state: "North Carolina", lat: 35.7847, lng: -78.6427 },
        { name: "Durham", state: "North Carolina", lat: 35.9931, lng: -78.8986 },
        { name: "Orange", state: "North Carolina", lat: 36.0613, lng: -79.1205 },
        { name: "Guilford", state: "North Carolina", lat: 36.0726, lng: -79.7920 },
        { name: "Forsyth", state: "North Carolina", lat: 36.1284, lng: -80.2073 }
    ];
    
    // 为每个县创建一个简化的GeoJSON特性
    mainCounties.forEach(county => {
        // 创建模拟数据
        countyData[`${county.name}, ${county.state}`] = createSimulatedCountyData(
            county.name, county.state, Math.floor(Math.random() * 3) + 1
        );
        
        // 创建一个正方形作为县的边界
        const size = 0.2; // 度数单位的大小
        const feature = {
            type: "Feature",
            properties: {
                NAME: county.name,
                STATE: county.state === "North Carolina" ? "37" : "00", // 北卡罗来纳州的FIPS代码
                COUNTY: "000" // 简化的县代码
            },
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [county.lng - size, county.lat - size],
                    [county.lng + size, county.lat - size],
                    [county.lng + size, county.lat + size],
                    [county.lng - size, county.lat + size],
                    [county.lng - size, county.lat - size] // 闭合多边形
                ]]
            }
        };
        
        simplifiedCounties.push(feature);
        
        // 预先添加县位置
        countyPositions[`${county.name}, ${county.state}`] = { lat: county.lat, lng: county.lng };
    });
    
    // 添加一些其他州的重要县
    const otherMainCounties = [
        { name: "Los Angeles", state: "California", lat: 34.0522, lng: -118.2437 },
        { name: "Cook", state: "Illinois", lat: 41.8781, lng: -87.6298 },
        { name: "Harris", state: "Texas", lat: 29.7604, lng: -95.3698 },
        { name: "Maricopa", state: "Arizona", lat: 33.4484, lng: -112.0740 },
        { name: "Kings", state: "New York", lat: 40.6782, lng: -73.9442 }
    ];
    
    otherMainCounties.forEach(county => {
        // 创建模拟数据
        countyData[`${county.name}, ${county.state}`] = createSimulatedCountyData(
            county.name, county.state, Math.floor(Math.random() * 3) + 1
        );
        
        const size = 0.3; // 度数单位的大小，较大县
        const feature = {
            type: "Feature",
            properties: {
                NAME: county.name,
                STATE: "00", // 简化的州FIPS代码
                COUNTY: "000" // 简化的县代码
            },
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [county.lng - size, county.lat - size],
                    [county.lng + size, county.lat - size],
                    [county.lng + size, county.lat + size],
                    [county.lng - size, county.lat + size],
                    [county.lng - size, county.lat - size] // 闭合多边形
                ]]
            }
        };
        
        simplifiedCounties.push(feature);
        
        // 预先添加县位置
        countyPositions[`${county.name}, ${county.state}`] = { lat: county.lat, lng: county.lng };
    });
    
    // 设置GeoJSON数据
    usCountiesData = {
        "type": "FeatureCollection",
        "features": simplifiedCounties
    };
    
    console.log(`Generated simplified county boundaries for ${simplifiedCounties.length} counties`);
    
    // 立即更新地图显示
    updateMap(true);
} 