const jq = require("jquery");
require('dotenv').config();

const key = process.env.APIKEY;
const ipv4 = "http://192.168.0.222:8123/"
const sonosKitchen = "media_player.kitchen_2";

class Toggle {
    constructor(obj) {
        this.obj = obj;
        this.id = obj.id;
        this.getState = this.getState.bind(this);
        this.setUI = this.setUI.bind(this);
        this.setState = this.setState.bind(this);
        this.toggleState = this.toggleState.bind(this);
        this.updateUI = this.updateUI.bind(this);
    }

    async getState() {
        const headers = {
            "Authorization": "Bearer " + key,
        };
        const response = await fetch(ipv4 + 'api/states/' + this.id, { headers });
        const data = await response.json();
        return data.state;
    }

    async setState(newState) {
        const headers = {
            "Authorization": "Bearer " + key,
        };
        await fetch(ipv4 + 'api/services/switch/turn_' + newState,
            {
                method: "post",
                headers,
                body: `{"entity_id": "${this.id}"}`
            }
        );
        this.setUI(newState);
    }

    async updateUI() {
        let state = await this.getState();
        this.setUI(state);
    }

    setUI(newState) {
        let oldState = newState === "on" ? "button-off" : "button-on";
        this.obj.classList.remove(oldState)
        this.obj.classList.add("button-" + newState)
    }

    async toggleState() {
        let oldState = await this.getState();
        let newState = oldState === "on" ? "off" : "on";
        await this.setState(newState)
    }
}

class MainToggle {
    constructor(toggles, obj) {
        this.toggles = toggles;
        this.obj = obj;
        obj.addEventListener('click', this.toggle)
    }

    getState = () => {
        let state = "off";
        this.toggles.forEach(toggle => {
            if (toggle.classList.contains("button-on")) {
                state = "on";
            }
        });
        return state;
    }

    toggle = () => {
        let oldState = this.getState();
        let newState = oldState === "on" ? "off" : "on";
        for (let i = 0; i < this.toggles.length; i++) {
            this.toggles[i].toggle.setState(newState);
        }
        this.setUI(newState);
    }

    setUI = (newState) => {
        let oldState = newState === "on" ? "off" : "on";
        this.obj.classList.remove("button-" + oldState);
        this.obj.classList.add("button-" + newState);
        this.obj.children[0].innerHTML = "Turn " + oldState;
    }

    updateUI = () => {
        this.setUI(this.getState())
    }
}

class MediaButtons {
    constructor(mediaPlayer, mediaButtons) {
        this.mediaPlayer = mediaPlayer;
        this.mediaButtons = mediaButtons;

        this.buttonPressed = this.buttonPressed.bind(this);
        this.getState = this.getState.bind(this);
        this.getCurrentTrack = this.getCurrentTrack.bind(this);
        this.setState = this.setState.bind(this);
        this.setTrack = this.setTrack.bind(this);
        this.updateUI = this.updateUI.bind(this);

        for (let i = 0; i < this.mediaButtons.length; i++) {
            this.mediaButtons[i].addEventListener('click', () => this.buttonPressed(this.mediaButtons[i].id))
        }

        this.updateUI();
    }

    async buttonPressed(id) {
        let state = await this.getState()
        let currentTrack = await this.getCurrentTrack();
        if (state === "playing") {
            if (currentTrack === id) {
                this.setState("pause")
                this.removeAllSelected();
            } else {
                await this.setTrack(id)
                this.setState("play")
                this.removeAllSelected();
                this.setSelected(id);
            }
        } else {
            if (currentTrack == id) {
                this.setState("play")
                this.setSelected(id);
            } else {
                await this.setTrack(id)
                this.setState("play")
                this.setSelected(id);
            }
        }
    }

    async setTrack(source) {
        const headers = {
            "Authorization": "Bearer " + key,
        };
        await fetch(ipv4 + 'api/services/media_player/play_media',
            {
                method: "post",
                headers,
                body: `{"entity_id": "${this.mediaPlayer}", "media_content_id" : "${source}", "media_content_type" : "music"}`
            }
        );
    }

    async setState(state) {
        const headers = {
            "Authorization": "Bearer " + key,
        };
        await fetch(ipv4 + 'api/services/media_player/media_' + state,
            {
                method: "post",
                headers,
                body: `{"entity_id": "${this.mediaPlayer}"}`
            }
        );
    }

    async getCurrentTrack() {
        const headers = {
            "Authorization": "Bearer " + key,
        };
        const response = await fetch(ipv4 + 'api/states/' + this.mediaPlayer, { headers });
        const data = await response.json();
        if (data.attributes.media_content_id.substring(0, 23) === "x-sonos-spotify:spotify") {
            return ("https://open.spotify.com/playlist/37i9dQZEVXbLnolsZ8PSNw?si=ii0INDRFQ7-B4nItbcVyJA&utm_source=copy-link")
        } else {
            return data.attributes.media_content_id;
        }
    }

    async getState() {
        const headers = {
            "Authorization": "Bearer " + key,
        };
        const response = await fetch(ipv4 + 'api/states/' + this.mediaPlayer, { headers });
        const data = await response.json();
        return data.state;
    }

    removeAllSelected = () => {
        let selected = document.getElementsByClassName("selected");
        for (let i = 0; i < selected.length; i++) {
            selected[i].classList.remove("selected")
        }
    }

    setSelected = (id) => {
        document.getElementById(id).classList.add("selected")
    }

    async updateUI() {
        let state = await this.getState();

        if (state === "paused") {
            this.removeAllSelected();
        } else {
            let currentTrack = await this.getCurrentTrack()
            let selected = document.getElementsByClassName("selected");
            for (let i = 0; i < selected.length; i++) {
                if (selected[i].id !== currentTrack) {
                    selected[i].classList.remove("selected");
                }
            }
            let element = document.getElementById(currentTrack);
            if (element.classList.contains("selected")) {
                return;
            } else {
                element.classList.add("selected");
            }
        }

    }

}

let elements = document.getElementsByClassName('toggle');

for (let i = 0; i < elements.length; i++) {
    elements[i].toggle = new Toggle(elements[i]);
    elements[i].addEventListener('click', elements[i].toggle.toggleState)
}

const lounge = new MainToggle(
    [
        document.getElementById("switch.front_lamp_socket"),
        document.getElementById("switch.small_lamp_socket"),
        document.getElementById("switch.back_lamps_socket"),
    ],
    document.getElementById("lounge")
);


const shed = new MainToggle(
    [
        document.getElementById("switch.tall_lamp_socket"),
        document.getElementById("switch.shed_heater"),
    ],
    document.getElementById("shed")
);


const mediaButtons = new MediaButtons(
    sonosKitchen,
    [
        document.getElementById("https://open.spotify.com/playlist/37i9dQZEVXbLnolsZ8PSNw?si=ii0INDRFQ7-B4nItbcVyJA&utm_source=copy-link"),
        document.getElementById("aac://http://media-ice.musicradio.com/HeartUK"),
        document.getElementById("x-rincon-mp3radio://http://stream.live.vc.bbcmedia.co.uk/bbc_radio_two"),
        document.getElementById("hls-radio://http://a.files.bbci.co.uk/media/live/manifesto/audio/simulcast/hls/nonuk/sbr_vlow/ak/bbc_radio_fourfm.m3u8"),

    ])

async function updateUIs() {
    for (let i = 0; i < elements.length; i++) {
        await elements[i].toggle.updateUI();
    }
    shed.updateUI()
    lounge.updateUI();
    mediaButtons.updateUI();
}
setInterval(updateUIs, 10 * 1000)


function updateWeather () {
    jq.ajax
        ({
            type: "GET",
            url: 'http://dataservice.accuweather.com/currentconditions/v1/2522448?apikey=jZFnKXVtgGQjyLR50G9GyixXVAq0UyDI',
            success(res) {
                document.getElementById("weather").innerHTML = (res[0].Temperature.Metric.Value + "°C " + res[0].WeatherText);
            }
        })
}
setInterval(function () {
    updateWeather();
}, 1000 * 60 * 30)


function getTime() {
    let date = new Date();
    let currentHour = date.getHours();
    let currentMinute = date.getMinutes();
    return (currentHour).toString().padStart(2, '0') + ":" + (currentMinute).toString().padStart(2, '0');
}
function updateTime() {
    document.getElementById("time").innerHTML = getTime();
}
setInterval(function () {
    updateTime();
}, 1000 * 60);


updateUIs();
updateTime();
updateWeather();
