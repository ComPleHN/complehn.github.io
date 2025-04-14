<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const aqiData = ref(null)
const loading = ref(true)
const error = ref(null)

// 根据AQI值获取对应的背景颜色和图标
const getAqiInfo = (aqi) => {
  if (aqi <= 50) return {
    background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)',
    icon: 'qi-wind-fill',
    advice: '空气质量令人满意，基本无空气污染'
  }
  if (aqi <= 100) return {
    background: 'linear-gradient(135deg, #f9d423 0%, #ff7e00 100%)',
    icon: 'qi-cloudy-fill',
    advice: '空气质量可接受，但某些污染物可能对极少数异常敏感人群健康有较弱影响'
  }
  if (aqi <= 150) return {
    background: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
    icon: 'qi-haze-fill',
    advice: '易感人群症状有轻度加剧，健康人群出现刺激症状'
  }
  if (aqi <= 200) return {
    background: 'linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%)',
    icon: 'qi-fog-fill',
    advice: '进一步加剧易感人群症状，可能对健康人群心脏、呼吸系统有影响'
  }
  return {
    background: 'linear-gradient(135deg, #8e44ad 0%, #5d2a82 100%)',
    icon: 'qi-dust-fill',
    advice: '健康人群运动耐受力降低，有明显强烈症状，提前出现某些疾病'
  }
}

const latitude = ref(null)
const longitude = ref(null)
const geoError = ref(null)
const weatherData = ref(null)

// 获取用户地理位置
const getGeoLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('浏览器不支持地理定位功能')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        latitude.value = position.coords.latitude
        longitude.value = position.coords.longitude
        resolve()
      },
      (error) => {
        const errors = {
          1: '权限被拒绝',
          2: '位置信息不可用',
          3: '请求超时'
        }
        reject(errors[error.code] || '无法获取位置信息')
      },
      { timeout: 10000 }
    )
  })
}

// 获取空气质量数据
const fetchAirQuality = async () => {
  try {
    loading.value = true
    await getGeoLocation()

    // 获取天气数据
    const weatherRes = await fetch(`https://mn6cdmfa3y.re.qweatherapi.com/v7/weather/now?location=${longitude.value},${latitude.value}&key=3ad25966b84645e4bb2b765e7d0c3d7c`)
    const weatherJson = await weatherRes.json()
    console.log(weatherJson);
    
    const { now } = weatherJson
    weatherData.value = {
      temp: now.temp,
      text: now.text,
      icon: now.icon,
      fxLink: weatherJson.fxLink,
      isRainy: now.icon.includes('rain') || now.icon.includes('snow'),
      isSunny: now.icon.includes('sunny') || now.icon.includes('clear'),
      isCloudy: now.icon.includes('cloudy')
    }
    console.log(weatherData.value.fxLink);
    

    // 获取空气质量数据
    const aqiRes = await fetch(`https://mn6cdmfa3y.re.qweatherapi.com/airquality/v1/current/${latitude.value}/${longitude.value}?key=3ad25966b84645e4bb2b765e7d0c3d7c`)
    const aqiJson = await aqiRes.json()
    const { aqi, category, color, health } = aqiJson.indexes[0]
    const aqiInfo = getAqiInfo(aqi)

    aqiData.value = {
      aqi,
      background: aqiInfo.background,
      category,
      color: `rgb(${color.red},${color.green},${color.blue})`,
      effect: health.effect,
      advice: aqiInfo.advice,
      icon: aqiInfo.icon,
      pollutants: aqiJson.pollutants.map(p => ({
        name: p.name,
        concentration: p.concentration.value,
        unit: p.concentration.unit
      })),
      pos: aqiJson.stations[0].name,
      updateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  } catch (err) {
    error.value = err
    console.error('获取数据失败:', err)
  } finally {
    loading.value = false
  }
}

let interval
onMounted(() => {
  fetchAirQuality()
  interval = setInterval(fetchAirQuality, 600000) // 每10分钟更新
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>

<template>
  <div class="min-h-screen flex flex-col p-4 md:p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50 mx-auto mb-4">
        </div>
        <p class="text-lg text-white/80">正在获取空气质量数据...</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center max-w-md bg-white/10 p-6 rounded-xl">
        <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
        <h2 class="text-xl font-bold mb-2">无法获取数据</h2>
        <p class="text-white/80 mb-4">{{ error }}</p>
        <button @click="fetchAirQuality" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors">
          <i class="fas fa-sync-alt mr-2"></i>重试
        </button>
      </div>
    </div>

    <!-- 正常状态 -->
    <div v-else-if="aqiData" class="max-w-6xl w-full mx-auto flex-1 flex flex-col gap-6">
      <!-- 顶部区域 -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold text-white/90">空气质量监测</h1>
          <p class="text-sm text-white/60 mt-1">
            <i class="fas fa-map-marker-alt mr-2"></i>
            {{ '当前位置:' + aqiData.pos }}
          </p>
        </div>
        <div
          class="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm md:text-base transition-colors cursor-pointer"
          @click="fetchAirQuality" title="点击刷新数据">
          <i class="fas fa-sync-alt mr-2" :class="{ 'animate-spin': loading }"></i>
          {{ aqiData.updateTime }}更新
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- AQI主卡片 -->
        <div class="backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/10 transition-all hover:shadow-xl"
          :style="{ background: aqiData.background }">
          <div class="flex flex-col items-center h-full">
            <!-- AQI数值和图标 -->
            <div class="flex items-center justify-center mb-4 gap-4 w-full">
              <div class="text-7xl font-bold text-white drop-shadow-lg">
                {{ aqiData.aqi || '--' }}
              </div>

              <!-- AQI类别 -->
              <div class="text-2xl font-semibold px-6 py-3 rounded-xl text-center mb-4 bg-white/20 backdrop-blur-sm">
                {{ aqiData.category || '未知' }}
              </div>

            </div>


            <!-- 健康建议 -->
            <div class="bg-white/20 backdrop-blur-sm p-4 rounded-xl w-full text-center">
              <p class="text-white/90">{{ aqiData.effect || aqiData.advice }}</p>
            </div>
          </div>
        </div>

        <!-- 天气卡片 -->
        <div v-if="weatherData"
          class="backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/10 transition-all hover:shadow-xl"
          :class="{
            'bg-gradient-to-br from-blue-400/20 to-blue-600/30': weatherData.isRainy,
            'bg-gradient-to-br from-yellow-400/20 to-amber-600/30': weatherData.isSunny,
            'bg-gradient-to-br from-gray-400/20 to-gray-600/30': weatherData.isCloudy,
            'bg-white/10': !weatherData.isRainy && !weatherData.isSunny && !weatherData.isCloudy
          }">
          <div class="flex flex-col h-full">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h2 class="text-2xl font-semibold mb-1">当前天气</h2>
                <p class="text-lg opacity-90">{{ weatherData.text }}</p>
              </div>
              <i :class="`qi-${weatherData.icon}-fill`" class="text-7xl opacity-90"></i>
            </div>

            <div class="mt-auto">
              <div class="flex items-baseline mb-2">
                <span class="text-6xl font-bold">{{ weatherData.temp }}</span>
                <span class="text-3xl ml-1 opacity-90">°C</span>
              </div>

              <a :href="weatherData.fxLink" target="_blank"
                class="inline-block mt-4 text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors">
                <i class="fa-external-link-alt mr-2"></i>查看详细天气预报
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 污染物网格 -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="p in aqiData.pollutants" :key="p.name"
          class="bg-white/10 hover:bg-white/20 p-5 rounded-xl transition-all backdrop-blur-sm">
          <div class="text-sm text-white/70 mb-2">{{ p.name }}</div>
          <div class="text-3xl font-bold mb-1">{{ p.concentration }}</div>
          <div class="text-xs text-white/50">{{ p.unit }}</div>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="mt-6 pt-6 border-t border-white/10 text-center text-sm text-white/60">
        <p>数据更新时间: {{ new Date().toLocaleString('zh-CN') }}</p>
        <p class="mt-1">信息由和风天气API提供</p>
      </div>
    </div>
  </div>
</template>

<style>

/* 添加一些动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 卡片悬停效果 */
.backdrop-blur-lg {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.backdrop-blur-lg:hover {
  transform: translateY(-2px);
}
</style>