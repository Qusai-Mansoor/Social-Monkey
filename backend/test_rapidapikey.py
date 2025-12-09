import requests

url = "https://twitter-api45.p.rapidapi.com/timeline.php"

querystring = {"screenname":"socialmonkeyweb"}

headers = {
	"x-rapidapi-key": "f7e522252emsh9fb33370222a64dp1d5be9jsn46d2547fdc5a",
	"x-rapidapi-host": "twitter-api45.p.rapidapi.com"
}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())