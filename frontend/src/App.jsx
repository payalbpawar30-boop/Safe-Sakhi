import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";
function App() {

    const [activePage, setActivePage] = useState("dashboard");
    const [backend, setBackend] = useState("Connecting...");
    const [contacts, setContacts] = useState([]);
    const [activities, setActivities] = useState([]);
    const [journey, setJourney] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const [location, setLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState("Location not detected");
    const [locationLoading, setLocationLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [checkInActive, setCheckInActive] = useState(false);
    const [checkInSeconds, setCheckInSeconds] = useState(0);
    const [checkInDuration, setCheckInDuration] = useState(1);
    const [checkInLoading, setCheckInLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [alertReady, setAlertReady] = useState(false);
    const [form, setForm] = useState({
        name: "",
        phone: "",
        relation: ""
    });
    const [editingContactId, setEditingContactId] = useState(null);
    const pageTitles = {
        dashboard: "Dashboard",
        contacts: "Trusted Contacts",
        journey: "Safe Journey",
        checkin: "Safety Check-in",
        location: "Live Location",
        emergency: "Emergency Center",
        activity: "Activity History"
    };
    async function loadData() {
        try {
            const [statusRes, contactsRes, activityRes, checkInRes] =
                await Promise.all([
                    fetch(`${API}/status`),
                    fetch(`${API}/contacts`),
                    fetch(`${API}/activity`),
                    fetch(`${API}/checkin`)
                ]);

            if (!statusRes.ok || !contactsRes.ok || !activityRes.ok || !checkInRes.ok) {
                throw new Error("Backend unavailable");
            }
            const status = await statusRes.json();
            const contactData = await contactsRes.json();
            const activityData = await activityRes.json();
            const checkInData = await checkInRes.json();

            setBackend(status.message);
            setContacts(contactData);
            setActivities(activityData);
            setJourney(status.journeyActive || false);
            setCheckInActive(checkInData.active || false);
            if (checkInData.active && checkInData.startedAt) {
                const endTime =
                    new Date(checkInData.startedAt).getTime() +
                    checkInData.duration * 60 * 1000;
                const remaining = Math.max(
                    0,Math.ceil((endTime - Date.now()) / 1000));
                setCheckInSeconds(remaining);
                setCheckInDuration(checkInData.duration);
            } else {

                setCheckInSeconds(0);
            }

        } catch {

            setBackend("Backend disconnected");
        }

    }
    useEffect(() => {

        loadData();

    }, []);
    useEffect(() => {
        if (!checkInActive) return;
        if (checkInSeconds <= 0) {
            finishCheckIn("missed");
            return;
        }
        const timer = setTimeout(() => {
            setCheckInSeconds(seconds => seconds - 1);
        }, 1000);

        return () => clearTimeout(timer);

    }, [checkInActive, checkInSeconds]);
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(
            remainingSeconds
        ).padStart(2, "0")}`;

    }
    function getCurrentLocation() {
        if (!navigator.geolocation) {
            setLocationStatus("Geolocation is not supported by your browser.");
            return;
        }
        setLocationLoading(true);
        setLocationStatus("Detecting your location...");
        navigator.geolocation.getCurrentPosition(
            position => {
                const currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };



                setLocation(currentLocation);

                setLocationStatus("Location detected successfully");

                setLocationLoading(false);

                setMessage("Your current location has been detected.");

            },

            error => {

                setLocationLoading(false);



                if (error.code === 1) {

                    setLocationStatus("Location permission denied. Allow location access in your browser.");

                } else if (error.code === 2) {

                    setLocationStatus("Location information unavailable.");

                } else {

                    setLocationStatus("Location request timed out. Try again.");

                }

            },

            {

                enableHighAccuracy: true,

                timeout: 15000,

                maximumAge: 0

            }

        );

    }



    function createEmergencyMessage() {

        const locationLink = location

            ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`

            : "Location is not available. Please contact me immediately.";



        return `EMERGENCY ALERT FROM SAFE SAKHI!\n\nI need your help. This is an emergency. Please contact me as soon as possible.\n\nMy current location:\n${locationLink}\n\nPlease respond immediately.`;

    }



    async function activateSOS() {

        const confirmed = window.confirm(

            "Do you want to generate an emergency alert?"

        );



        if (!confirmed) return;



        try {

            const response = await fetch(`${API}/sos`, {

                method: "POST"

            });



            if (!response.ok) throw new Error();



            setAlertMessage(createEmergencyMessage());

            setAlertReady(true);

            setMessage("Emergency alert generated. You can now share it with your trusted contacts.");

            loadData();

        } catch {

            setMessage("Cannot connect to backend. Please check the server.");

        }

    }



    function shareWhatsApp(phone) {

        const cleanPhone = phone.replace(/\D/g, "");



        if (cleanPhone.length < 10) {

            setMessage("Please check the contact's phone number.");

            return;

        }



        const whatsappURL = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(alertMessage)}`;



        window.open(whatsappURL, "_blank", "noopener,noreferrer");

    }



    async function addContact(e) {

        e.preventDefault();



        try {

            const response = await fetch(`${API}/contacts`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(form)

            });



            const data = await response.json();



            if (!response.ok) {

                throw new Error(data.message);

            }



            setForm({ name: "", phone: "", relation: "" });

            setShowContactForm(false);

            setMessage("Trusted contact added.");

            loadData();

        } catch (error) {

            setMessage(error.message || "Unable to add contact.");

        }

    }



    function startEditContact(contact) {
        setEditingContactId(contact.id);
        setForm({
            name: contact.name,
            phone: contact.phone,
            relation: contact.relation || "Other"
        });
        setShowContactForm(false);
    }

    function cancelEditContact() {
        setEditingContactId(null);
        setForm({ name: "", phone: "", relation: "" });
    }

    async function updateContact(e) {
        e.preventDefault();

        try {
            const response = await fetch(`${API}/contacts/${editingContactId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update contact.");
            }

            cancelEditContact();
            setMessage("Trusted contact updated successfully.");
            await loadData();
        } catch (error) {
            setMessage(error.message || "Unable to update contact.");
        }
    }

    async function deleteContact(id) {

        try {

            const response = await fetch(`${API}/contacts/${id}`, {

                method: "DELETE"

            });



            if (!response.ok) throw new Error();



            setMessage("Contact deleted.");

            loadData();

        } catch {

            setMessage("Unable to delete contact.");

        }

    }



    async function toggleJourney() {

        try {

            const response = await fetch(`${API}/journey`, {

                method: "POST"

            });



            if (!response.ok) throw new Error();



            const data = await response.json();



            setJourney(data.active);

            setMessage(data.message);

            loadData();

        } catch {

            setMessage("Unable to connect to backend.");

        }

    }



    async function startCheckIn() {

        setCheckInLoading(true);



        try {

            const response = await fetch(`${API}/checkin/start`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    duration: checkInDuration

                })

            });



            const data = await response.json();



            if (!response.ok) {

                throw new Error(data.message);

            }



            setCheckInSeconds(checkInDuration * 60);

            setCheckInActive(true);

            setMessage("Safety check-in started.");

        } catch (error) {

            setMessage(error.message || "Unable to start check-in.");

        } finally {

            setCheckInLoading(false);

        }

    }



    async function finishCheckIn(result) {

        if (!checkInActive) return;



        setCheckInActive(false);

        setCheckInSeconds(0);



        try {

            const response = await fetch(`${API}/checkin/finish`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({ result })

            });



            const data = await response.json();



            if (!response.ok) {

                throw new Error(data.message);

            }



            setMessage(

                result === "safe"

                    ? "You confirmed that you are safe."

                    : "Your missed check-in has been recorded."

            );



            loadData();

        } catch (error) {

            setMessage(error.message || "Unable to update check-in.");

        }

    }



    function navigate(page) {

        setActivePage(page);

        setMessage("");

        window.scrollTo({ top: 0, behavior: "smooth" });

    }



    return (

        <div className="app">

            <aside className="sidebar">

                <div className="brand">

                    <div className="brand-icon">S</div>

                    <div>

                        <h2>Safe Sakhi</h2>

                        <span>YOUR SAFETY COMPANION</span>

                    </div>

                </div>



                <nav>

                    {Object.entries({

                        dashboard: "⌂ Dashboard",

                        contacts: "♡ Trusted Contacts",

                        journey: "➤ Safe Journey",

                        checkin: "✓ Safety Check-in",

                        location: "⌖ Live Location",

                        emergency: "⚠ Emergency Center",

                        activity: "◷ Activity History"

                    }).map(([page, label]) => (

                        <a

                            key={page}

                            href={`#${page}`}

                            className={activePage === page ? "active" : ""}

                            onClick={e => {

                                e.preventDefault();

                                navigate(page);

                            }}

                        >

                            {label}

                        </a>

                    ))}

                </nav>



                <div className="sidebar-bottom">

                    <div className="profile">

                        <div className="avatar">S</div>

                        <div>

                            <strong>Safe User</strong>

                            <small>Personal Account</small>

                        </div>

                    </div>

                </div>

            </aside>



            <main className="main">

                <header className="topbar">

                    <div>

                        <h2>{pageTitles[activePage]}</h2>

                        <p>Your personal safety companion</p>

                    </div>



                    <div className="connection">

                        <span className="online-dot"></span>

                        {backend === "Backend disconnected"

                            ? "Backend Offline"

                            : "System Online"}

                    </div>

                </header>



                {message && (

                    <div className="message">

                        {message}

                        <button onClick={() => setMessage("")}>×</button>

                    </div>

                )}



                {activePage === "dashboard" && (

                    <>

                        <section className="welcome">

                            <div>

                                <span className="welcome-tag">WELCOME TO SAFE SAKHI</span>

                                <h1>Your safety, our priority.</h1>

                                <p>

                                    Stay connected. Stay protected.

                                    Take control of your personal safety.

                                </p>

                            </div>

                            <div className="welcome-symbol">♡</div>

                        </section>



                        <section className="section-heading">

                            <div>

                                <h2>Safety Overview</h2>

                                <p>Monitor your safety features</p>

                            </div>

                        </section>



                        <section className="stats">

                            <div className="stat-card">

                                <div className="stat-icon purple">♡</div>

                                <div>

                                    <span>Trusted Contacts</span>

                                    <h2>{contacts.length}</h2>

                                </div>

                            </div>



                            <div className="stat-card">

                                <div className="stat-icon green">✓</div>

                                <div>

                                    <span>Safety Status</span>

                                    <h2>Active</h2>

                                </div>

                            </div>



                            <div className="stat-card">

                                <div className="stat-icon orange">➤</div>

                                <div>

                                    <span>Safe Journey</span>

                                    <h2>{journey ? "Ongoing" : "Inactive"}</h2>

                                </div>

                            </div>

                        </section>



                        <section className="emergency-card">

                            <div className="emergency-content">

                                <span className="emergency-label">

                                    EMERGENCY ASSISTANCE

                                </span>

                                <h2>Need immediate help?</h2>

                                <p>

                                    Generate an emergency message and share it

                                    with your trusted contacts through WhatsApp.

                                </p>

                                <button

                                    className="sos-button"

                                    onClick={() => navigate("emergency")}

                                >

                                    <span>✚</span> OPEN EMERGENCY CENTER

                                </button>

                                <small>

                                    You can review and manually share your alert.

                                </small>

                            </div>

                            <div className="emergency-icon">!</div>

                        </section>



                        <section className="content-grid">

                            <div className="panel">

                                <div className="panel-heading">

                                    <div>

                                        <h2>Trusted Contacts</h2>

                                        <p>Your emergency contact list</p>

                                    </div>

                                    <button

                                        className="small-button"

                                        onClick={() => navigate("contacts")}

                                    >

                                        View Contacts

                                    </button>

                                </div>

                                <div className="location-content">

                                    <div className="location-symbol">♡</div>

                                    <h3>{contacts.length} Trusted Contact(s)</h3>

                                    <p>Manage your emergency contacts.</p>

                                    <button

                                        className="location-button"

                                        onClick={() => navigate("contacts")}

                                    >

                                        Manage Contacts

                                    </button>

                                </div>

                            </div>



                            <div className="panel">

                                <div className="panel-heading">

                                    <div>

                                        <h2>Safe Journey</h2>

                                        <p>Manage your journey status</p>

                                    </div>

                                    <span className={journey ? "journey-active" : "journey-off"}>

                                        {journey ? "ONGOING" : "INACTIVE"}

                                    </span>

                                </div>

                                <div className="location-content">

                                    <div className="journey-illustration">➤</div>

                                    <h3>{journey ? "Journey in progress" : "Travel with confidence"}</h3>

                                    <p>Record when you start and finish a journey.</p>

                                    <button

                                        className="journey-button"

                                        onClick={() => navigate("journey")}

                                    >

                                        Manage Journey

                                    </button>

                                </div>

                            </div>

                        </section>

                    </>

                )}



                {activePage === "contacts" && (

                    <section className="panel page-panel" id="contacts">

                        <div className="panel-heading">

                            <div>

                                <h2>Trusted Contacts</h2>

                                <p>Your emergency contact list</p>

                            </div>

                            <button

                                className="small-button"

                                onClick={() => setShowContactForm(!showContactForm)}

                            >

                                {showContactForm ? "Cancel" : "+ Add Contact"}

                            </button>

                        </div>



                        {showContactForm && (

                            <form className="contact-form" onSubmit={addContact}>

                                <input

                                    placeholder="Full name"

                                    value={form.name}

                                    onChange={e => setForm({ ...form, name: e.target.value })}

                                    required

                                />

                                <input

                                    placeholder="Phone number with country code"

                                    value={form.phone}

                                    onChange={e => setForm({ ...form, phone: e.target.value })}

                                    required

                                />

                                <input

                                    placeholder="Relation"

                                    value={form.relation}

                                    onChange={e => setForm({ ...form, relation: e.target.value })}

                                />

                                <button type="submit" className="small-button">

                                    Save Contact

                                </button>

                            </form>

                        )}



                        {contacts.length === 0 ? (

                            <div className="empty">

                                <span>♡</span>

                                <p>No trusted contacts added yet.</p>

                            </div>

                        ) : (

                            contacts.map(contact => (
                                <div className="contact-item" key={contact.id}>
                                    {editingContactId === contact.id ? (
                                        <form className="contact-form edit-contact-form" onSubmit={updateContact}>
                                            <input
                                                placeholder="Full name"
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                required
                                            />
                                            <input
                                                placeholder="Phone number with country code"
                                                value={form.phone}
                                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                                required
                                            />
                                            <input
                                                placeholder="Relation"
                                                value={form.relation}
                                                onChange={e => setForm({ ...form, relation: e.target.value })}
                                            />
                                            <div className="edit-contact-actions">
                                                <button type="submit" className="small-button">Save Changes</button>
                                                <button type="button" className="delete-button" onClick={cancelEditContact}>Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="avatar">
                                                {contact.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="contact-info">
                                                <strong>{contact.name}</strong>
                                                <small>
                                                    {contact.relation || "Other"} · {contact.phone}
                                                </small>
                                            </div>
                                            <div className="contact-actions">
                                                <button
                                                    className="small-button"
                                                    onClick={() => startEditContact(contact)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="delete-button"
                                                    onClick={() => deleteContact(contact.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))

                        )}

                    </section>

                )}



                {activePage === "journey" && (

                    <section className="panel page-panel" id="journey">

                        <div className="panel-heading">

                            <div>

                                <h2>Safe Journey</h2>

                                <p>Manage your journey status</p>

                            </div>

                            <span className={journey ? "journey-active" : "journey-off"}>

                                {journey ? "ONGOING" : "INACTIVE"}

                            </span>

                        </div>



                        <div className="location-content">

                            <div className="journey-illustration">➤</div>

                            <h3>{journey ? "Journey in progress" : "Travel with confidence"}</h3>

                            <p className="journey-description">

                                Record when you start and finish a journey.

                            </p>

                            <button className="journey-button" onClick={toggleJourney}>

                                {journey ? "End Journey" : "Start Safe Journey"}

                            </button>

                        </div>

                    </section>

                )}



                {activePage === "checkin" && (

                    <section className="panel page-panel" id="checkin">

                        <div className="panel-heading">

                            <div>

                                <h2>Emergency Safety Check-in</h2>

                                <p>Confirm that you are safe before the timer ends</p>

                            </div>

                            <span className={checkInActive ? "journey-active" : "journey-off"}>

                                {checkInActive ? "ACTIVE" : "INACTIVE"}

                            </span>

                        </div>



                        <div className="location-content">

                            {checkInActive ? (

                                <>

                                    <div className="journey-illustration">

                                        {formatTime(checkInSeconds)}

                                    </div>

                                    <h3>Waiting for your safety confirmation</h3>

                                    <p className="journey-description">

                                        Please confirm that you are safe before the countdown ends.

                                    </p>

                                    <button

                                        className="journey-button"

                                        onClick={() => finishCheckIn("safe")}

                                    >

                                        ✓ I'm Safe

                                    </button>

                                </>

                            ) : (

                                <>

                                    <div className="location-symbol">✓</div>

                                    <h3>Start a Safety Check-in</h3>

                                    <p>

                                        Choose a time and confirm your safety when the timer is running.

                                    </p>



                                    <div className="duration-options">

                                        {[1, 3, 5].map(duration => (

                                            <button

                                                key={duration}

                                                className="small-button"

                                                style={{

                                                    opacity: checkInDuration === duration ? 1 : 0.65,

                                                    border: checkInDuration === duration

                                                        ? "2px solid #7b4ce0"

                                                        : "1px solid #ddd"

                                                }}

                                                onClick={() => setCheckInDuration(duration)}

                                            >

                                                {duration} Minute{duration > 1 ? "s" : ""}

                                            </button>

                                        ))}

                                    </div>



                                    <button

                                        className="location-button"

                                        onClick={startCheckIn}

                                        disabled={checkInLoading}

                                    >

                                        {checkInLoading ? "Starting..." : "Start Safety Check-in"}

                                    </button>

                                </>

                            )}

                        </div>



                        <p className="feature-note">

                            Demo feature only. Missed check-ins are recorded but do not send emergency alerts.

                        </p>

                    </section>

                )}



                {activePage === "location" && (

                    <section className="panel location-panel page-panel" id="location">

                        <div className="panel-heading">

                            <div>

                                <h2>Live Location</h2>

                                <p>Detect your current device location</p>

                            </div>

                            <span className="location-badge">GPS</span>

                        </div>



                        <div className="location-content">

                            <div className="location-symbol">⌖</div>

                            <h3>Know where you are</h3>

                            <p>

                                Allow browser location access to detect your current coordinates.

                            </p>



                            <button

                                className="location-button"

                                onClick={getCurrentLocation}

                                disabled={locationLoading}

                            >

                                {locationLoading

                                    ? "Detecting Location..."

                                    : "⌖ Get Current Location"}

                            </button>



                            <div className="location-status">

                                <span className={location ? "location-dot detected" : "location-dot"}></span>

                                {locationStatus}

                            </div>



                            {location && (

                                <div className="coordinates">

                                    <div>

                                        <span>Latitude</span>

                                        <strong>{location.latitude.toFixed(6)}</strong>

                                    </div>

                                    <div>

                                        <span>Longitude</span>

                                        <strong>{location.longitude.toFixed(6)}</strong>

                                    </div>

                                    <div>

                                        <span>Accuracy</span>

                                        <strong>±{Math.round(location.accuracy)} metres</strong>

                                    </div>



                                    <a

                                        className="map-link"

                                        href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}

                                        target="_blank"

                                        rel="noreferrer"

                                    >

                                        Open Location in Google Maps ↗

                                    </a>

                                </div>

                            )}

                        </div>

                    </section>

                )}



                {activePage === "emergency" && (

                    <section className="panel page-panel" id="emergency-alert">

                        <div className="panel-heading">

                            <div>

                                <h2>Emergency Alert System</h2>

                                <p>Share an emergency message with trusted contacts</p>

                            </div>

                            <span className="location-badge">SOS</span>

                        </div>



                        {!alertReady ? (

                            <div className="location-content">

                                <div className="emergency-icon">!</div>

                                <h3>Prepare an Emergency Alert</h3>

                                <p>

                                    Detect your location first if you want to include GPS coordinates.

                                </p>

                                <button className="location-button" onClick={activateSOS}>

                                    Generate Emergency Alert

                                </button>

                            </div>

                        ) : (

                            <div className="emergency-alert-content">

                                <div className="alert-preview">

                                    {alertMessage}

                                </div>



                                <h3 className="contact-select-heading">

                                    Select a trusted contact

                                </h3>



                                {contacts.length === 0 ? (

                                    <div className="empty">

                                        <span>♡</span>

                                        <p>Add trusted contacts before sharing an alert.</p>

                                    </div>

                                ) : (

                                    contacts.map(contact => (

                                        <div className="contact-item" key={contact.id}>

                                            <div className="avatar">

                                                {contact.name.charAt(0).toUpperCase()}

                                            </div>

                                            <div className="contact-info">

                                                <strong>{contact.name}</strong>

                                                <small>{contact.phone}</small>

                                            </div>

                                            <button

                                                className="small-button"

                                                onClick={() => shareWhatsApp(contact.phone)}

                                            >

                                                Share WhatsApp

                                            </button>

                                        </div>

                                    ))

                                )}



                                <button

                                    className="refresh-button close-alert-button"

                                    onClick={() => {

                                        setAlertReady(false);

                                        setAlertMessage("");

                                    }}

                                >

                                    Close Alert

                                </button>

                            </div>

                        )}



                        <p className="feature-note">

                            Demo only. WhatsApp opens for you to review and manually send the message. It does not automatically contact anyone.

                        </p>

                    </section>

                )}



                {activePage === "activity" && (

                    <section className="panel activity-panel page-panel" id="activity">

                        <div className="panel-heading">

                            <div>

                                <h2>Activity History</h2>

                                <p>Your previous safety activities</p>

                            </div>

                            <button className="refresh-button" onClick={loadData}>

                                ↻ Refresh

                            </button>

                        </div>



                        {activities.length === 0 ? (

                            <div className="empty">

                                <span>◷</span>

                                <p>No activity recorded yet.</p>

                            </div>

                        ) : (

                            activities.map((item, index) => (

                                <div className="activity-item" key={item.id || index}>

                                    <div className="activity-icon">

                                        {item.type === "SOS"

                                            ? "!"

                                            : item.type === "Check-in"

                                                ? "✓"

                                                : "➤"}

                                    </div>

                                    <div>

                                        <strong>{item.message}</strong>

                                        <small>{item.time}</small>

                                    </div>

                                </div>

                            ))

                        )}

                    </section>

                )}



                <footer>

                    <p>Safe Sakhi © 2026 · Your safety matters.</p>

                    <span>Backend: {backend}</span>

                </footer>

            </main>

        </div>

    );

}



export default App;
