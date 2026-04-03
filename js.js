const client_id = ""
const client_secret = ""
const search_URL = "https://api.spotify.com/v1/search?"
const Storage = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    getLogged: () => localStorage.getItem('logged_user'),
    getCurrentUser: function () {
        const username = this.getLogged();
        const users = this.get('users');
        return users.find(u => u.username === username) || null;
    }
};

async function getToken() {
    var url = "https://accounts.spotify.com/api/token"
    await fetch(url, {
        method: "POST",
        headers: {
            Authorization: "Basic " + btoa(`${client_id}:${client_secret}`),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
    })
        .then((response) => response.json())
        .then((tokenResponse) => {
            const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
            localStorage.setItem('access_token', tokenResponse.access_token)
            localStorage.setItem('token_expiry', expiryTime)
        })
}

function isTokenValid() {
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');
    if (!token || !expiry || Date.now() > (expiry - 30000)) {
        return false
    }
    return true
}

function loadIndex() {
    let loggedTab = document.getElementById('logged')
    let notLoggedTab = document.getElementById('notLogged')
    let welcomeTab = document.getElementById('welcome')
    let loggedUser = localStorage.getItem('logged_user')
    if (loggedUser != undefined) {
        loggedTab.classList.remove('d-none')
        welcomeTab.innerHTML += "<div class='text-center'><p class'text-center'>Ciao " + loggedUser.name + ", cosa vuoi fare?</p></div>"
        notLoggedTab.classList.add('d-none')
    }
}

function register(event) {
    event.preventDefault();
    let users = Storage.get('users');

    let username = document.getElementById("usernameInputField").value;
    let email = document.getElementById("emailInputField").value;
    let password = document.getElementById("passwordInputField").value;
    let password2 = document.getElementById("passwordRepeatInputField").value;

    let user = {
        name: document.getElementById("nameInputField").value,
        surname: document.getElementById("surnameInputField").value,
        username: username,
        email: email,
        password: password,
        genres: Array.from(document.querySelectorAll("#checkboxes input[type=checkbox]:checked")).map(chk => chk.value),
        favArtists: [],
        favPlaylists: [],
    };

    if (checkUser(users, user, password2)) {
        users.push(user);
        Storage.set('users', users);
        alert('Registrazione completata');
        window.location.href = 'login.html';
    }
}

function checkUser(users, user, password2) {
    //name
    var usernameInputField = document.getElementById('usernameInputField')
    var emailInputField = document.getElementById('emailInputField')
    var passInputField = document.getElementById('passwordInputField')

    if (!(validateName(user.username))) {
        usernameInputField.focus()
        return false
    }

    if (!(validateEmail(user.email))) {
        emailInputField.focus()
        return false
    }

    if (!(validatePassword(user.password, password2))) {
        passInputField.focus()
        return false
    }

    if (users.some(u => u.username == user.username)) {
        alert("Username già in uso")
        return false
    } else if (users.some(u => u.email == user.email)) {
        alert("Utente già registrato")
        return false
    }
    return true
}

function validateName(name) {
    var namePattern = new RegExp(/^[a-zA-Z ]+$/);
    if (name.length < 3) {
        alert("Il nome deve contener almeno 3 caratteri")
        return false
    } else if (!(namePattern.test(name))) {
        alert('Il nome deve contenere solo lettere')
        return false
    }
    return true
}

function validateEmail(mail) {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
        return true
    }
    alert("Hai inserito un indirizzo email non valido!")
    return false
}

function validatePassword(password, password2) {
    if (/^[a-zA-Z0-9!@#\$%\^\&*\)\(+=._-].{6,20}$/.test(password)) {
        if (password == password2) {
            return true
        } else {
            alert("Le password non combaciano!")
            return false
        }
    } else {
        alert("Hai inserito una password troppo debole!")
        return false
    }
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById('inputEmail').value;
    const password = document.getElementById('inputPassword').value;
    const users = Storage.get('users');

    const found_user = users.find(u => u.email === email && u.password === password);

    if (!found_user) {
        alert("Credenziali errate");
        return;
    }

    localStorage.setItem('logged_user', found_user.username)
    window.location.href = 'index.html';
}

function loadSearch() {
    const params = new URLSearchParams(window.location.search)
    for (const p of params) {
        if (p[1] == "track") {
            document.getElementById('srcTrack').setAttribute('selected', 'selected')
        } else {
            document.getElementById('srcArtist').setAttribute('selected', 'selected')
        }
    }
}

function search() {
    var input = document.getElementById('search_input').value
    var type = document.getElementById('resource').value
    var uri = `https://api.spotify.com/v1/search?q=${input}&type=${type}`

    if (!isTokenValid()) {
        getToken()
    }

    if (input.length >= 3) {
        fetch(uri, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem('access_token')}`
            }
        })
            .then(resource => {
                if (resource.ok) {
                    return resource.json()

                } else {
                    alert("Errore: " + resource.status)
                }
            })
            .then(res => {
                if (type == "track") {
                    showTracks(res)
                } else {
                    showArtists(res)
                }
            })
    }
}

function showPlaylist() {
    var playlists = Storage.get('playlists')
    var logged_user = Storage.getCurrentUser()
    var playlistSelect = document.getElementById('playlistSelect')
    var playlistForm = document.getElementById('playlistForm')

    if (logged_user.favPlaylists.length == 0) {
        playlistForm.classList.remove('d-none')
    }

    logged_user.favPlaylists.forEach(playlist => {
        let found = playlists.find(p => p.name == playlist)
        playlistSelect.innerHTML += `<li><button type="button" class="btn btn-primary dropdown-item" onclick='searchTracks("${found.name}")'>${found.name}</button></li>`
    })
}

function searchTracks(playlist) {
    var playlistHeader = document.getElementById('playlistHeader')
    var playlistButtons = document.getElementById('playlistButtons')
    var playlists = Storage.get('playlists')
    var index = playlists.findIndex(p => p.name == playlist)
    var uri = "https://api.spotify.com/v1/tracks?ids="

    if (playlists[index].tracklist.length === 0) {
        alert("Questa playlist è vuota!");
        return;
    }

    if (!isTokenValid()) {
        getToken()
    }

    playlists[index].tracklist.forEach(track => {
        uri += `${track},`
    })
    uri = uri.slice(0, uri.length - 1)

    fetch(uri, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
    })
        .then(resource => {
            if (resource.ok) {
                return resource.json()

            } else {
                alert("Errore: " + resource.status)
            }
        })
        .then(res => {
            playlistHeader.innerHTML += `<h3>Playlist: ${playlist}</h3><p>${playlists[index].description}</p>`
            playlistButtons.innerHTML += `<div><button type="button" class="btn btn-primary" onclick='deletePlaylist("${playlist}")'>Cancella playlist</button></div>`
            showTracks(res)
        })
}

function showTracks(res) {
    var modello = document.getElementById('modello_canzoni');
    var contenuto = document.getElementById('contenuto_canzoni');
    contenuto.innerHTML = "";
    contenuto.append(modello);

    if (res.tracks.items != undefined) {
        for (var i = 0; i < res.tracks.items.length; i++) {
            var clone = modello.cloneNode(true);
            var track = res.tracks.items[i];

            clone.getElementsByClassName('card-title')[0].innerHTML = track.name;
            var artists = clone.getElementsByClassName('card-artists')
            artists[0].innerHTML = ""
            track.artists.forEach(artist => {
                artists[0].innerHTML += `${artist.name}, `
            })
            artists[0].innerHTML = artists[0].innerText.slice(0, artists[0].innerText.length - 2)
            clone.getElementsByTagName('img')[0].src = track.album.images[0].url;

            clone.getElementsByClassName('card-duration')[0].innerHTML = `Durata: ${millisToMinutesAndSeconds(track.duration_ms)}`

            clone.getElementsByClassName('card-album')[0].innerHTML = `Album: ${track.album.name}`

            var dropdown = clone.getElementsByClassName('addToPlaylist')[0]
            dropdown.innerHTML = ""
            logged_user = Storage.getCurrentUser()
            logged_user.favPlaylists.forEach(playlist => {
                dropdown.innerHTML += `<li><button type="button" class="btn btn-primary dropdown-item" onclick='addToPlaylist("${track.id}", "${playlist}")'>${playlist}</button>`
            })

            clone.classList.remove('d-none');
            modello.before(clone);
        }
    } else {
        for (var i = 0; i < res.tracks.length; i++) {
            var clone = modello.cloneNode(true);
            var track = res.tracks[i];

            clone.getElementsByClassName('card-title')[0].innerHTML = track.name;
            var artists = clone.getElementsByClassName('card-artists')
            artists[0].innerHTML = ""
            track.artists.forEach(artist => {
                artists[0].innerHTML += `${artist.name}, `
            })
            artists[0].innerHTML = artists[0].innerText.slice(0, artists[0].innerText.length - 2)
            clone.getElementsByTagName('img')[0].src = track.album.images[0].url;

            clone.getElementsByClassName('card-duration')[0].innerHTML = `Durata: ${millisToMinutesAndSeconds(track.duration_ms)}`

            clone.getElementsByClassName('card-album')[0].innerHTML = `Album: ${track.album.name}`

            clone.classList.remove('d-none');
            modello.before(clone);
        }
    }

}

function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000)
    var seconds = ((millis % 60000) / 1000).toFixed(0)
    return (
        seconds == 60 ?
            (minutes + 1) + ":00" :
            minutes + ":" + (seconds < 10 ? "0" : "") + seconds
    )
}

function showArtists(res) {
    var modello = document.getElementById('modello_artisti');
    var contenuto = document.getElementById('contenuto_artisti');
    contenuto.innerHTML = "";
    contenuto.append(modello);

    for (var i = 0; i < res.artists.items.length; i++) {
        var clone = modello.cloneNode(true);
        var artist = res.artists.items[i];

        clone.getElementsByClassName('card-title')[0].innerHTML = artist.name;
        var genres = clone.getElementsByClassName('card-genres')
        genres[0].innerHTML = ""
        artist.genres.forEach(gen => {
            genres[0].innerHTML += `${gen}, `
        })
        genres[0].innerHTML = genres[0].innerText.slice(0, genres[0].innerText.length - 2)
        clone.getElementsByTagName('img')[0].src = artist.images[0].url;

        clone.getElementsByClassName('artistBtn')[0].value = `${artist.name}`

        clone.classList.remove('d-none');
        modello.before(clone);
    }
}

function addFavouriteArtist(event) {
    const artist = event.target.value;
    const currentUser = Storage.getCurrentUser();

    if (!currentUser) return alert("Devi essere loggato!");

    let users = Storage.get('users');
    let userIndex = users.findIndex(u => u.username === currentUser.username);

    if (!users[userIndex].favArtists.includes(artist)) {
        users[userIndex].favArtists.push(artist);
        Storage.set('users', users);
        alert(`${artist} aggiunto ai preferiti!`);
    }
}

function createPlaylist() {
    const currentUser = Storage.getCurrentUser();
    let users = Storage.get('users');
    let playlists = Storage.get('playlists');

    const name = document.getElementById('name').value.trim();

    if (playlists.some(p => p.name === name)) return alert("Nome già usato");

    const newPlaylist = {
        name: name,
        tracklist: [],
        author: currentUser.username
    };

    playlists.push(newPlaylist);
    Storage.set('playlists', playlists);

    let userIndex = users.findIndex(u => u.username === currentUser.username);
    users[userIndex].favPlaylists.push(name);
    Storage.set('users', users);

    alert("Playlist creata!");
    window.location.href = "ricerca.html"
}

function deletePlaylist(playlist) {

    let playlists = Storage.get('playlists')
    let users = Storage.get('users')
    let loggedUser = Storage.getCurrentUser()

    if (!loggedUser) {
        alert("Errore: nessun utente loggato.");
        return;
    }

    playlists = playlists.filter(p => p.name !== playlist);

    loggedUser.favPlaylists = loggedUser.favPlaylists.filter(name => name !== playlist);

    let userIndex = users.findIndex(u => u.name === loggedUser.name);
    if (userIndex !== -1) {
        users[userIndex].favPlaylists = loggedUser.favPlaylists;
    }

    Storage.set('playlists', playlists)
    localStorage.setItem('logged_user', loggedUser.username)
    Storage.set('users', users)

    alert("Playlist '" + playlist + "' eliminata correttamente!");

    location.reload();
}


function addToPlaylist(trackId, playlist) {
    var playlists = Storage.get('playlists')

    var playlistIndex = playlists.findIndex(p => p.name == playlist)
    playlists[playlistIndex].tracklist.push(trackId)
    localStorage.setItem('playlists', JSON.stringify(playlists));
}

function showProfile() {
    const user = Storage.getCurrentUser();
    if (!user) return (window.location.href = 'login.html');

    const modello = document.getElementById('modello_profilo');
    const contenuto = document.getElementById('contenuto_profilo');

    contenuto.innerHTML = "";
    contenuto.append(modello);

    const clone = modello.cloneNode(true);

    clone.querySelector('.card-name').innerText = `${user.name} ${user.surname}`;
    clone.querySelector('.card-username').innerText = user.username;
    clone.querySelector('.card-email').innerText = user.email;

    const genreContainer = clone.querySelector('.list-genres');
    user.genres.forEach(g => {
        genreContainer.innerHTML += `<span class="badge bg-secondary m-1">${g}</span>`;
    });

    const playlistUl = clone.querySelector('#lista_playlist_utente');
    if (user.favPlaylists.length > 0) {
        user.favPlaylists.forEach(pl => {
            playlistUl.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${pl}
                    
                </li>`;
        });
    } else {
        playlistUl.innerHTML = "<li class='list-group-item text-muted'>Nessuna playlist creata</li>";
    }

    const artistDiv = clone.querySelector('#lista_artisti_preferiti');
    user.favArtists.forEach(art => {
        artistDiv.innerHTML += `<span class="badge bg-dark m-1">${art}</span>`;
    });

    clone.classList.remove('d-none');
    modello.before(clone);
}

function toggleEdit(show) {
    const user = Storage.getCurrentUser();
    const sectionView = document.getElementById('contenuto_profilo');
    const sectionEdit = document.getElementById('contenitore_modifica');

    if (show) {
        document.getElementById('editName').value = user.name;
        document.getElementById('editSurname').value = user.surname;

        const checks = document.querySelectorAll("#editCheckboxes input");
        checks.forEach(c => c.checked = user.genres.includes(c.value));

        sectionView.classList.add('d-none');
        sectionEdit.classList.remove('d-none');
    } else {
        sectionView.classList.remove('d-none');
        sectionEdit.classList.add('d-none');
    }
}

function saveProfileChanges(event) {
    event.preventDefault();

    let users = Storage.get('users');
    const username = Storage.getLogged();
    const idx = users.findIndex(u => u.username === username);

    if (idx !== -1) {
        users[idx].name = document.getElementById('editName').value;
        users[idx].surname = document.getElementById('editSurname').value;

        const newPass = document.getElementById('editPassword').value;
        if (newPass.length >= 6) {
            users[idx].password = newPass;
        }

        users[idx].genres = Array.from(document.querySelectorAll("#editCheckboxes input:checked"))
            .map(c => c.value);

        Storage.set('users', users);
        alert("Modifiche salvate!");
        toggleEdit(false);
        window.location.reload()
    }
}

function deleteAccount() {
    const conferma = confirm("Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.");

    if (conferma) {
        let users = Storage.get('users');
        const loggedUsername = Storage.getLogged();

        const updatedUsers = users.filter(u => u.username !== loggedUsername);

        let playlists = Storage.get('playlists');
        const updatedPlaylists = playlists.filter(p => p.author !== loggedUsername);

        Storage.set('users', updatedUsers);
        Storage.set('playlists', updatedPlaylists);

        logout();
    }
}

function logout() {
    localStorage.removeItem('logged_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expiry');

    alert("Account eliminato con successo. Verrai reindirizzato alla Home.");
    window.location.href = 'index.html';
}