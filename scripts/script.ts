import { type Track, type TrackDetails, generateAccessToken, fetchAll, fetchById } from "./api.js";
import { getRandomLetter, isExplicit, convertMillisecondsDuration } from "./utils.js";

const mainContainer = document.getElementById('container');
if (!mainContainer) {
    throw new Error("Critical Error: Main container not found in the DOM.");
}
const bodyContainer = document.querySelector('body'); // For Click Event Delegation
if (!bodyContainer) {
    throw new Error("Critical Error: Body container not found in the DOM.");
}
const detailedViewNav = document.querySelector('.navbar-detailed-view');
if (!detailedViewNav) {
    throw new Error("Critical Error: Detailed view container not found in the DOM.");
}
const listViewNav = document.querySelector('.navbar-list-view');
if (!listViewNav) {
    throw new Error("Critical Error: List view container not found in the DOM.");
}

// Prompt 31: Write a FilterState object that should hold `query`, `genre`, `decade`, and `explicit` as keys, all initialized as empty strings
const FilterState = {
    q: '',
    genre: '',
    decade: '',
};

// Prompt 6: Write an object called DataStore that should have an empty array called allTracks, a method getTracks that returns a JSON parsed object from localStorage under the key 'trackData' or an empty array; a method called setTracks that simply takes a tracks object and sets allTracks using `this`; and finally a getTracks method that returns allTracks using `this`.
const DataStore = {
    // We store and "cache" the list here so that we don't have to fetch
    // it every single time we go back from the detailed track page view
    allTracks: [] as Track[], // Tell TS this starts empty but will hold Tracks

    getTracksFromStorage(): Track[] {
        const data = localStorage.getItem('trackData'); // Attempt to retrieve data
        return data ? JSON.parse(data) : []; // If data was retrieved, parse it, else return an empty list
    },

    // Prompt 7: Write a method like the one above called saveTracksToStorage that takes a list and saves it to localStorage under 'trackData' using JSON stringify
    saveTracksToStorage(tracks: Track[]): void {
        localStorage.setItem('trackData', JSON.stringify(tracks));
    },

    setTracks(tracks: Track[]): void {
        this.allTracks = tracks;
    },

    getTracks(): Track[] {
        return this.allTracks;
    },

    // Prompt 16: Add access token here itilialized as an empty string. Write a method getAccessTokenFromStorage and a method saveAccessTokenFromStorage
    getAccessTokenFromStorage(): string {
        return localStorage.getItem('accessToken') || '';
    },

    saveAccessTokenToStorage(token: string): void {
        localStorage.setItem('accessToken', token);
    },

    // Prompt 17: Write a setAccessToken and getAccessToken. 
    // Ended up not getting used.

    // Prompt 40: Add methods to save/load filter state
    saveFilterStateToStorage(): void {
        localStorage.setItem('filterState', JSON.stringify(FilterState));
    },

    loadFilterStateFromStorage(): void {
        const data = localStorage.getItem('filterState');
        if (data) {
            const saved = JSON.parse(data);
            FilterState.q = saved.q || '';
            FilterState.genre = saved.genre || '';
            FilterState.decade = saved.decade || '';
        }
    },
};

const ViewRenderer = {
    renderLoading(): void {
        // We wipe the stage and show a placeholder to signal 'Work in Progress'
        mainContainer.innerHTML = `
            <div class="loading-state">
                
            </div>
        `;
    },

    // Prompt 9: Create a renderList function that takes `tracks` as its input argument. It should first clear mainContainer using innerHTML. Then it creates a const html variable using tracks and the map method to create an HTML string that contains a div with class `track-item` and data-id being track.id wrappaing three <p> tags: artist name, album title, and year. Append it to mainContainer using insertAdjacentHTML and 'beforeend'.
    renderList(tracks: Track[]): void {
        mainContainer.innerHTML = '';

        const tracksHTML = tracks.map(track => `
            <div class="track-item" data-id="${track.id}">
                <img src="${track.album.images?.[0]?.url || './img/404-not-found.png'}" alt="Album Cover">
                <p><strong>${track.name}</strong></p>
                <p>${track.artists?.[0]?.name}</p>
                <p>${track.album.name}</p>
                <p>${track.album.release_date.substring(0, 4)}</p>
            </div>
        `).join('');

        const html = `
        <div class="track-container">
            ${tracksHTML}
        </div>
        `;

        mainContainer.insertAdjacentHTML('beforeend', html);
    },

    renderDetailed(track: TrackDetails): void {
        // Prompt 13: Write the renderDetailed method. Just like renderList, it also starts by first clearing the mainContainer. Here we can create html directly; a div with class track-detailed-view, inside there are two divs; track-detailed-view-media-wrapper wraps the image, track-detailed-view-info-wrapper takes the title as an h1, artist name and album title as h3, year, duration and explicit as p tags and finally a "Listen on Spotify" button that has the href from the track data. Append to mainContainer using insertAdjacentHTML.
        mainContainer.innerHTML = '';

        const html = `
            <div class="track-detailed-view">
                <div class="track-detailed-view-media-wrapper">
                    <img src="${track.album.images?.[0]?.url || './img/404-not-found.png'}" alt="${track.name}">
                </div>
                <div class="track-detailed-view-info-wrapper">
                    <h1>${track.name}</h1>
                    <h3>${track.artists?.[0]?.name}</h3>
                    <h3>${track.album.name}</h3>
                    <p>${track.album.release_date.substring(0, 4)}</p>
                    <p>${convertMillisecondsDuration(track.duration_ms)}</p>
                    <p>${isExplicit(track.explicit)}</p>
                    <button><a href="${track.external_urls.spotify}" target="_blank">Listen on Spotify</a></button>
                </div>
            </div>
        `;

        mainContainer.insertAdjacentHTML('beforeend', html);

        // Detailed view should also toggle hidden in the correct nav elements!
        detailedViewNav.classList.toggle('hidden');
        listViewNav.classList.toggle('hidden');
    }
}

// Prompt 32: Write a buildSearchUrl that has string as return type. It starts by initializing randomLetter using getRandomLetter() and initializing searchTerm conditionally based on FilterState has a query or not, else randomLetter.
// function buildSearchUrl(): string {
//     const randomLetter = getRandomLetter();

//     // If user typed something, use it. Otherwise, use the random letter.
//     // This is "Design by Contract": the API gets what it expects.
//     const searchTerm = FilterState.q || randomLetter;

//     const base = `http://localhost:3000/search`; // localhost for now
    
//     // Prompt 33: Initialize the params variable as a `new` `URLSearchParams` object. It hold `q`, `type`, `market`, `limit` and then the rest of the FilterState keys. q is set to SearchTerm. type is 'track' and market is 'SE'. If we have a query, limit is 10, else 2. The last three are derived from FilterState. Return the resulting URL using base and params toString()
//     const params = new URLSearchParams({
//         q: searchTerm,
//         type: 'track',
//         market: 'SE',
//         limit: FilterState.q ? '10' : '2', // 10 for real user search, 2 for the random algorithm
//         genre: FilterState.genre,
//         decade: FilterState.decade,
//     });

//     return `${base}?${params.toString()}`;
// }
// Ended up not getting used! The "URL building" logic now lives inside of fetchAll!

// Prompt 36: Write an async function called triggerNewSearch. It should start by calling renderLoading from the ViewRenderer. Then in a try/catch block, it initializes `tracks` using fetchAll, passing all keys from FilterState as input argument. It then calls setTracks and renderList with `tracks`.
async function triggerNewSearch(): Promise<void> {
    ViewRenderer.renderLoading();

    try {
        const tracks = await fetchAll(FilterState);

        DataStore.setTracks(tracks);
        ViewRenderer.renderList(tracks);
    } catch (error) {
        if (!mainContainer) {
            console.error("Main element not found");
            return
        }
        mainContainer.innerHTML = `Error during search: ${error}. Please try again.`;
    }
}

// Prompt 12: Write an async function called init that uses a try/catch block to initialize initList using fetchAll and then sets this using setTracks from DataStore and renders the list using renderList. Fill the innerHTML of mainContainer with an appropriate error message in the catch block.
async function init() {
    // Show our Loading State as we initialize the app for the first time!
    ViewRenderer.renderLoading();

    try {
        // 1. Token Logic
        // Prompt 18: Use getAccessTokenFromStorage to check to see if we have an Access Token in localStorage. If we don't, call generateAccessToken to generate one and save it to localStorage with saveAccessTokenToStorage
        if (!DataStore.getAccessTokenFromStorage()) {
            const token = await generateAccessToken();
            DataStore.saveAccessTokenToStorage(token.access_token);

            // Prompt 19: Also store an expiration timestamp (current time + (3600 * 1000) ms (an hour)) in localStorage
            localStorage.setItem('tokenExpiration', String(Date.now() + 3600 * 1000));
        }

        // 2. NEW Load Saved Filters (just copied from Gemini and not prompted since I'm 99% done and want to be 100% done haha)
        DataStore.loadFilterStateFromStorage();

        // Restore UI (Update the inputs to match state)
        const genreSelect = document.getElementById('genre-select') as HTMLSelectElement;
        const decadeSelect = document.getElementById('decade-select') as HTMLSelectElement;
        const searchInput = document.getElementById('search-input') as HTMLInputElement;

        // "|| ''" protects us if the state is null/undefined
        if (genreSelect) genreSelect.value = FilterState.genre || '';
        if (decadeSelect) decadeSelect.value = FilterState.decade || '';
        if (searchInput) searchInput.value = FilterState.q || '';
        

        // Fetch initial list and store it as cache in our DataStore
        const initList = await fetchAll();
        DataStore.setTracks(initList);

        // Render our initial list
        ViewRenderer.renderList(initList);
    } catch (error) {
        if (!mainContainer) {
            console.error("Main element not found");
            return
        }
        mainContainer.innerHTML = `Error when rendering site: ${error}. Please try again.`;
    }
}

// One Event Delegation block for all clicks
bodyContainer.addEventListener('click', async (e) => {
    // What did we click?
    // TRACE: Did we click a track card?
    // Prompt 14: First, create a const variable trackCard using e.target, closest and the track-item class. Then, write the first click case: if we have a trackCard, create a pointer using dataset.id followed by a try/catch that fetches the track by id and renders it usign renderDetailed. Fall back to List view on error and handle the error gracefully.
    // Use "as HTMLElement" to unlock element-specific methods
    const target = e.target as HTMLElement; 
    console.log("Target: ", target);
    const trackCard = target.closest('.track-item') as HTMLElement;

    if (trackCard) {
        const trackId = trackCard.dataset.id;
        // trackId might be undefined!
        if (trackId) {
            try {
                const track = await fetchById(trackId);
                ViewRenderer.renderDetailed(track);
            } catch (error) {
                console.error('Error fetching track details:', error); // We'll return to how we render errors
                ViewRenderer.renderList(DataStore.getTracks());
            }
        }
    }

    // TRACE: Did we click 'Go Back'?
    // Prompt 15: If the id of e.target is 'back-btn', retrieve the initial list we cached with init and re-render it.
    if ((e.target as HTMLElement).id === 'back-btn') {
        console.log("Back button pressed!");

        // The "Fade Back" animation to be added here
        // 1. Find the element we want to animate out
        const currentDetailView = mainContainer.querySelector('.track-detailed-view');

        if (currentDetailView) {
            // 2. Add your CSS class to trigger the animation
            currentDetailView.classList.add('fade-back');

            // 3. Wait for the animation (0.5s) to finish before switching
            setTimeout(() => {
                const tracks = DataStore.getTracks();
                ViewRenderer.renderList(tracks); // State Change: Detailed View -> List View

                // Toggle navbars AFTER the view switches
                detailedViewNav.classList.toggle('hidden');
                listViewNav.classList.toggle('hidden');
            }, 450); // 450ms is slightly safer than 500ms to avoid a flash of white

        } else {
            // We retrieve the initial list we cached during init()
            const tracks = DataStore.getTracks();

            // Re-render the list. State Change: Detailed View -> List View
            ViewRenderer.renderList(tracks);

            // Going back from detailed view should also toggle hidden in the correct nav elements!
            detailedViewNav.classList.toggle('hidden');
            listViewNav.classList.toggle('hidden');
        }
    }

    // TRACE: Did we click 'Re-shuffle'?
    if ((e.target as HTMLElement).id === 're-shuffle') {
        console.log("Re-shuffle button pressed!");
        
        // Show the Loading State as the app is re-initialized
        ViewRenderer.renderLoading();

        // Simply re-initialize the list! Works for now since our init is rather simple
        init();
    }
});

// One Event Delegation block for all "changes" (dropdown)
// Prompt 37: Attach a 'change' eventListener to listViewNav. Initialize `target` using e.target `as` HTMLInputElement or HTMLSelectElement. Use target.tagName in an if statement to confirm that e.target is looking at an <input> or <select> element. Make a placeholder switch block in the if statement for now. After the switch block (that is to be implemented), call triggerNewSearch.
listViewNav.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;

    if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        switch (target.id) {
            // Prompt 39: Look for 'search-input' (set FilterState's `q` key to target.value and break), 'genre-select' (check if they selected 'any', upon which FilterState's `genre` key is set to an empty string, else target.value), and finally 'decade-select'. If it's this last one, the logic is similar but use convertDecadeFormat before setting FilterState's `decade`.
            case 'search-input':
                FilterState.q = target.value;
                break;
            case 'genre-select':
                // Check if they selected "Any!" (value="any") or default
                FilterState.genre = target.value === 'any' ? '' : target.value;
                break;
            case 'decade-select':
                // Use our helper function for decade to align with the Spotify API!
                FilterState.decade = target.value === 'any' ? '' : target.value;
                break;
        }

        DataStore.saveFilterStateToStorage(); // Use our new function to save FilterState to localStorage!
        triggerNewSearch();
    }
});

// "Power on" our Full Stack app
window.addEventListener("DOMContentLoaded", init);
