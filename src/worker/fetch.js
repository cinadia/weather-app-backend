// TODO: need to install node-fetch
import fetch from 'node-fetch';
import redis from 'redis';
// let fetch = require('node-fetch');
// let redis = require('redis');


// create redis client
const client = redis.createClient();
client.on('error', (err) => console.log('Redis Client Error', err));

const baseURL = "https://api.openweathermap.org/data/2.5/forecast?lat=49.282730&lon=-123.120735&appid=b960595956aa7918b0312905d0a88ce4&units=metric";

async function fetchToday() { // TODO: need to fetch early in the day
   // fetch from URL
   const res = await fetch(baseURL);
   const jsonRes = await res.json();

   //console.log(jsonRes);

   // transform data
   // const city = jsonRes.city; // data on the selected city (currently Vancouver)
   const allWeatherData = jsonRes.list; // five day forecast data
   const todaysWeather = {};
   for (let i = 0; i < allWeatherData.length; i++) {
      todaysWeather[allWeatherData[i].dt_txt] = flattenJSON(allWeatherData[i]);
   }

   console.log(todaysWeather);

   // summarize today's data to display as 'yesterday''s data tomorrow
   const todaysSummary = getTodaysSummary(todaysWeather);

   // open the connection
   await client.connect();

   // set todaysWeather in redis
   await client.set('todaysWeather', JSON.stringify(todaysWeather));
   const todaysWeatherSuccess = await client.get('todaysWeather');
   // set todaysSummary in redis
   await client.set('todaysSummary', JSON.stringify(todaysSummary));
   const todaysSummarySuccess = await client.get('todaysSummary');

   // TODO: get yesterday's data from redis. swap today and yesterday data
   // await client.get('yesterdaysSummary');

   /*
   await client.set('city', JSON.stringify(city));
   const citySuccess = await client.get('city');

    */

   //console.log({weatherSuccess});
   // console.log({citySuccess});

   // close the connection
   const [ping, get, quit] = await Promise.all([
      client.ping(),
      client.get('key'),
      client.quit()
   ]); // ['PONG', null, 'OK']
}

const flattenJSON = (obj = {}, res = {}, extraKey = '') => {
   for(let key in obj){
      if(typeof obj[key] !== 'object'){
         res[extraKey + key] = obj[key];
      }else{
         flattenJSON(obj[key], res, `${extraKey}${key}.`);
      };
   };
   return res;
};

const getTodaysSummary = (fiveDayData = {}) => {
   const temps = [];
   const descs = [];
   const todaysData = {};

   for (const [key, value] of Object.entries(fiveDayData)) {
      if (key.toString().includes('2022-09-12')) { // TODO: replace with getDate()
         const temp = value['main.temp'];
         const desc = value['weather.0.description'];
         temps.push(temp);
         descs.push(desc);
      }
   }

   const highTemp = getHighTemp(temps);
   const lowTemp = getLowTemp(temps);

   todaysData['temp'] = (highTemp + lowTemp) / 2;
   todaysData['desc'] = getOverallDescription(descs);
   todaysData['high'] = highTemp;
   todaysData['low'] = lowTemp;

   console.log(todaysData);

   //console.log(descs);


}

const getOverallDescription = (allDesc = []) => {
   const dict = {};
   for (const desc of allDesc) {
      if (!(desc in dict)) {
         dict[desc] = 1;
      } else {
         dict[desc] = ++dict[desc];
      }
   }
   //console.log(dict);

   let currentMax = 0;
   let currentDesc = "";
   for (const [key, value] of Object.entries(dict)) {
      if (value > currentMax) {
         currentDesc = key.toString();
         currentMax = value;
      }
   }
   //console.log(currentDesc);
   return currentDesc;
}

const getHighTemp = (allTemps = []) => {
   let currentMax = allTemps[0];
   for (const i of allTemps) {
      if (i > currentMax) {
         currentMax = i;
      }
   }
   return currentMax;
}

const getLowTemp = (allTemps = []) => {
   let currentLow = allTemps[0];
   for (const i of allTemps) {
      if (i < currentLow) {
         currentLow = i;
      }
   }
   return currentLow;
}

const getDate = () => {
   const today = new Date();
   const dd = String(today.getDate()).padStart(2, '0');
   const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
   const yyyy = today.getFullYear();

   const todayString = yyyy + '-' + mm + '-' + dd;

   //console.log(todayString);
   return todayString;
}

fetchToday();

//module.exports = fetchToday;