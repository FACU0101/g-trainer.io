"use strict";



/*

*============================================================*

*G-TRAINER — APLICACIÓN PRINCIPAL*

*Archivo: app.js*



*Funciones:*

*- Clientes: crear, editar, buscar y eliminar.*

*- Rutinas: asignar, consultar y eliminar.*

*- Pagos: registrar, consultar, marcar abonado/pendiente y eliminar.*

*- Resumen: estadísticas actualizadas.*

*- Copias de seguridad: exportar e importar JSON.*



*Base de datos existente: GTrainerDB*

*No se elimina ni se recrea intencionalmente.*

*============================================================*

*/





//* ==========================================================*

//* 1. CONFIGURACIÓN Y REFERENCIAS HTML*

//* ==========================================================*



const DB_NAME = "GTrainerDB";

const DB_VERSION = 1;

const BACKUP_PREFIX = "G-Trainer-respaldo";



const STORE_NAMES = [

    "clients",

    "routines",

    "progress",

    "payments"

];



let db = null;

let toastTimer = null;



const navButtons = document.querySelectorAll(".nav-button");

const pageTitle = document.getElementById("page-title");



const statClients = document.getElementById("stat-clients");

const statRoutines = document.getElementById("stat-routines");

const statPending = document.getElementById("stat-pending");



const clientList = document.getElementById("client-list");

const clientSearch = document.getElementById("client-search");

const newClientButton = document.getElementById("btn-new-client");
const newClientListButton = document.getElementById("btn-new-client-list");



const clientDialog = document.getElementById("client-dialog");

const clientForm = document.getElementById("client-form");

const clientDialogTitle = document.getElementById("client-dialog-title");

const clientIdInput = document.getElementById("client-id");

const clientNameInput = document.getElementById("client-name");

const clientPhoneInput = document.getElementById("client-phone");

const clientEmailInput = document.getElementById("client-email");

const clientStartDateInput = document.getElementById("client-start-date");

const clientNotesInput = document.getElementById("client-notes");



const closeDialogButton = document.getElementById("btn-close-dialog");

const cancelClientButton = document.getElementById("btn-cancel-client");



const routineForm = document.getElementById("routine-form");

const routineClientSelect = document.getElementById("routine-client");

const routineNameInput = document.getElementById("routine-name");

const routineDaysInput = document.getElementById("routine-days");

const routineExercisesInput = document.getElementById("routine-exercises");

const routineList = document.getElementById("routine-list");



const paymentForm = document.getElementById("payment-form");

const paymentClientSelect = document.getElementById("payment-client");

const paymentPeriodInput = document.getElementById("payment-period");

const paymentAmountInput = document.getElementById("payment-amount");

const paymentDueDateInput = document.getElementById("payment-due-date");

const paymentStatusInput = document.getElementById("payment-status");

const paymentList = document.getElementById("payment-list");




const exportButton = document.getElementById("btn-export");

const backupFileInput = document.getElementById("backup-file");

const backupStatus = document.getElementById("backup-status");



const recentActivity = document.getElementById("recent-activity");

const toastElement = document.getElementById("app-toast");





//* ==========================================================*

//* 2. MENSAJES Y UTILIDADES*

//* ==========================================================*



function showToast(message) {

    toastElement.textContent = message;

    toastElement.classList.add("visible");



    clearTimeout(toastTimer);



    toastTimer = setTimeout(() => {

        toastElement.classList.remove("visible");

    }, 3200);

}



function showBackupStatus(message) {

    backupStatus.textContent = message;

}



function showDatabaseError(error) {

    console.error("Error de G-Trainer:", error);

    showToast("No se pudo completar la operación. Revisá la consola.");

}



function getTodayDate() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(2, "0");

    const day = String(now.getDate()).padStart(2, "0");



    return `${year}-${month}-${day}`;

}



function formatDate(dateString) {

    if (!dateString) return "Sin fecha indicada";



    //* Las fechas de los inputs date se interpretan como fechas locales.*

    const parts = dateString.split("-");



    if (parts.length !== 3) return dateString;



    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}



function formatMoney(amount) {

    return new Intl.NumberFormat("es-AR", {

        style: "currency",

        currency: "ARS",

        maximumFractionDigits: 2

    }).format(Number(amount) || 0);

}



function createElement(tag, className, text) {

    const element = document.createElement(tag);



    if (className) element.className = className;

    if (text !== undefined) element.textContent = text;



    return element;

}





//* ==========================================================*

//* 3. BASE DE DATOS INDEXEDDB*

//* ==========================================================*



function openDatabase() {

    return new Promise((resolve, reject) => {

        if (!("indexedDB" in window)) {

            reject(new Error("Este navegador no admite IndexedDB."));

            return;

        }



        const request = indexedDB.open(DB_NAME, DB_VERSION);



        request.onupgradeneeded = (event) => {

            const database = event.target.result;



            //* Solo crea los almacenes que todavía no existan.*

            //* No elimina los datos de los almacenes existentes.*

            STORE_NAMES.forEach((storeName) => {

                if (!database.objectStoreNames.contains(storeName)) {

                    database.createObjectStore(storeName, {

                        keyPath: "id",

                        autoIncrement: true

                    });

                }

            });

        };



        request.onsuccess = () => {

            db = request.result;



            db.onversionchange = () => {

                db.close();

            };



            resolve(db);

        };



        request.onerror = () => reject(request.error);



        request.onblocked = () => {

            console.warn(

                "La base está bloqueada. Cerrá otras pestañas de G-Trainer."

            );

        };

    });

}



function getAllRecords(storeName) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(storeName, "readonly");

        const request = transaction.objectStore(storeName).getAll();



        request.onsuccess = () => resolve(request.result);

        request.onerror = () => reject(request.error);

    });

}



function getRecord(storeName, id) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(storeName, "readonly");

        const request = transaction.objectStore(storeName).get(Number(id));



        request.onsuccess = () => resolve(request.result);

        request.onerror = () => reject(request.error);

    });

}



function saveRecord(storeName, record) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(storeName, "readwrite");

        const request = transaction.objectStore(storeName).put(record);



        request.onsuccess = () => resolve(request.result);

        request.onerror = () => reject(request.error);

    });

}



function deleteRecord(storeName, id) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(storeName, "readwrite");

        const request = transaction.objectStore(storeName).delete(Number(id));



        request.onsuccess = () => resolve(true);

        request.onerror = () => reject(request.error);

    });

}





//* ==========================================================*

//* 4. NAVEGACIÓN*

//* ==========================================================*



function setupNavigation() {

    navButtons.forEach((button) => {

        button.addEventListener("click", async () => {

            const sectionId = button.dataset.section;

            const selectedSection = document.getElementById(sectionId);



            if (!selectedSection) return;



            document.querySelectorAll(".page-section").forEach((section) => {

                section.hidden = true;

            });



            selectedSection.hidden = false;



            navButtons.forEach((item) => item.classList.remove("active"));

            button.classList.add("active");



            pageTitle.textContent = button.textContent.trim();



            try {

                if (sectionId === "dashboard") {

                    await updateDashboard();

                }



                if (sectionId === "clients") {

                    await renderClients();

                }



                if (sectionId === "routines") {

                    await populateClientSelects();

                    await renderRoutines();

                }



                if (sectionId === "payments") {

                    await populateClientSelects();

                    await renderPayments();

                }

                if (sectionId === "progress") {
                    await populateClientSelects();
                    await renderProgress();
                }

            } catch (error) {

                showDatabaseError(error);

            }

        });

    });

}





//* ==========================================================*

//* 5. CLIENTES: FORMULARIO*

//* ==========================================================*



function openNewClientDialog() {

    clientForm.reset();

    clientIdInput.value = "";

    clientDialogTitle.textContent = "Nuevo cliente";

    clientStartDateInput.value = getTodayDate();



    clientDialog.showModal();

    clientNameInput.focus();

}



async function openEditClientDialog(id) {

    try {

        const client = await getRecord("clients", id);



        if (!client) {

            showToast("No se encontró ese cliente.");

            return;

        }



        clientIdInput.value = client.id;

        clientNameInput.value = client.name || "";

        clientPhoneInput.value = client.phone || "";

        clientEmailInput.value = client.email || "";

        clientStartDateInput.value = client.startDate || "";

        clientNotesInput.value = client.notes || "";



        clientDialogTitle.textContent = "Editar cliente";

        clientDialog.showModal();

        clientNameInput.focus();

    } catch (error) {

        showDatabaseError(error);

    }

}



async function handleClientFormSubmit(event) {

    event.preventDefault();



    const name = clientNameInput.value.trim();



    if (!name) {

        showToast("Ingresá el nombre del cliente.");

        clientNameInput.focus();

        return;

    }



    const existingId = clientIdInput.value;



    try {

        const client = {

            name,

            phone: clientPhoneInput.value.trim(),

            email: clientEmailInput.value.trim(),

            startDate: clientStartDateInput.value,

            notes: clientNotesInput.value.trim(),

            updatedAt: new Date().toISOString()

        };



        if (existingId !== "") {

            client.id = Number(existingId);



            const previous = await getRecord("clients", client.id);



            if (!previous) {

                showToast("El cliente ya no existe.");

                return;

            }



            client.createdAt = previous.createdAt || client.updatedAt;

        } else {

            client.createdAt = client.updatedAt;

        }



        await saveRecord("clients", client);



        clientDialog.close();

        clientForm.reset();



        //* Actualizamos la lista y los selectores de los otros módulos.*

        await renderClients();

        await populateClientSelects();

        await updateDashboard();



        await updateRecentActivity(

            existingId

                ? `Se actualizó el perfil de ${name}.`

                : `Se registró a ${name}.`

        );



        showToast(

            existingId

                ? "Cliente actualizado correctamente."

                : "Cliente registrado correctamente."

        );

    } catch (error) {

        showDatabaseError(error);

    }

}





//* ==========================================================*

//* 6. CLIENTES: LISTA Y ELIMINACIÓN*

//* ==========================================================*



function createClientCard(client) {

    const card = createElement("article", "client-card");

    const header = createElement("div", "client-card-header");

    const avatar = createElement(

        "div",

        "client-avatar",

        (client.name || "?").charAt(0).toUpperCase()

    );

    const identity = document.createElement("div");



    identity.append(

        createElement("h4", "", client.name || "Sin nombre"),

        createElement(

            "div",

            "client-date",

            client.startDate

                ? `Inicio: ${formatDate(client.startDate)}`

                : "Fecha de inicio no indicada"

        )

    );



    header.append(avatar, identity);

    card.append(header);



    if (client.phone) {

        card.append(createElement("p", "", `Teléfono: ${client.phone}`));

    }



    if (client.email) {

        card.append(createElement("p", "", `Correo: ${client.email}`));

    }



    if (client.notes) {

        card.append(createElement("p", "client-notes", client.notes));

    }



    const actions = createElement("div", "client-actions");



    const editButton = createElement("button", "secondary-button", "Editar");

    editButton.type = "button";

    editButton.addEventListener("click", () => {

        openEditClientDialog(client.id);

    });



    const deleteButton = createElement("button", "danger-button", "Eliminar");

    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {

        handleDeleteClient(client);

    });



    actions.append(editButton, deleteButton);

    card.append(actions);



    return card;

}



async function renderClients() {

    const clients = await getAllRecords("clients");

    const searchText = clientSearch.value.trim().toLowerCase();



    const filteredClients = clients.filter((client) => {

        const searchableText = [

            client.name,

            client.phone,

            client.email

        ].join(" ").toLowerCase();



        return searchableText.includes(searchText);

    });



    clientList.replaceChildren();



    if (filteredClients.length === 0) {

        const empty = createElement("div", "empty-state");

        empty.append(

            createElement("div", "empty-icon", "♙"),

            createElement(

                "h4",

                "",

                searchText

                    ? "No se encontraron resultados"

                    : "Todavía no hay clientes"

            ),

            createElement(

                "p",

                "",

                searchText

                    ? "Probá con otro nombre o término de búsqueda."

                    : "Usá el botón Nuevo cliente para comenzar."

            )

        );



        clientList.append(empty);

        return;

    }



    filteredClients.sort((a, b) => {

        const dateA = a.updatedAt || a.createdAt || "";

        const dateB = b.updatedAt || b.createdAt || "";

        return dateB.localeCompare(dateA);

    });



    filteredClients.forEach((client) => {

        clientList.append(createClientCard(client));

    });

}



async function handleDeleteClient(client) {

    const confirmed = window.confirm(

        `¿Eliminar a ${client.name}?\n\n` +

        "También se eliminarán sus rutinas, registros de seguimiento " +

        "y pagos asociados. Esta acción no se puede deshacer."

    );



    if (!confirmed) return;



    try {

        //* Quitamos también los registros relacionados para no dejar*

        //* rutinas o pagos sin un cliente válido.*

        const relatedStores = ["routines", "progress", "payments"];



        for (const storeName of relatedStores) {

            const records = await getAllRecords(storeName);



            for (const record of records) {

                if (Number(record.clientId) === Number(client.id)) {

                    await deleteRecord(storeName, record.id);

                }

            }

        }



        await deleteRecord("clients", client.id);



        await renderClients();

        await populateClientSelects();

        await renderRoutines();

        await renderPayments();

        await updateDashboard();



        await updateRecentActivity(`Se eliminó el perfil de ${client.name}.`);



        showToast("Cliente y registros asociados eliminados.");

    } catch (error) {

        showDatabaseError(error);

    }

}





//* ==========================================================*

//* 7. SELECTORES DE CLIENTES: SOLUCIÓN AL PROBLEMA*

//* ==========================================================*



/*

*Esta función es la clave para que aparezcan los clientes.*



*1. Lee los clientes reales de IndexedDB.*

*2. Limpia los selectores anteriores.*

*3. Crea una opción para cada cliente.*

*4. Conserva la selección si el cliente todavía existe.*



*Se usa tanto en Rutinas como en Pagos.*

*/

async function populateClientSelects() {

    const clients = await getAllRecords("clients");



    const selectConfigs = [

        {

            select: routineClientSelect,

            placeholder: "Seleccioná un cliente"

        },

        {

            select: paymentClientSelect,

            placeholder: "Seleccioná un cliente"

        },
        {
            select: progressClientSelect,
            placeholder: "Seleccioná un cliente"
        }

    ];



    for (const config of selectConfigs) {

        const select = config.select;



        if (!select) continue;



        const previousValue = select.value;

        select.replaceChildren();



        const placeholder = document.createElement("option");

        placeholder.value = "";

        placeholder.textContent = clients.length

            ? config.placeholder

            : "Primero registrá un cliente";



        select.append(placeholder);



        //* Orden alfabético para encontrar personas fácilmente.*

        const sortedClients = [...clients].sort((a, b) => {

            return (a.name || "").localeCompare(

                b.name || "",

                "es",

                { sensitivity: "base" }

            );

        });



        for (const client of sortedClients) {

            const option = document.createElement("option");

            option.value = String(client.id);

            option.textContent = client.name || `Cliente ${client.id}`;

            select.append(option);

        }



        //* Si sigue existiendo la selección anterior, la restauramos.*

        if (

            previousValue &&

            clients.some((client) => String(client.id) === previousValue)

        ) {

            select.value = previousValue;

        }

    }

}





// ============================================================
// SEGUIMIENTO FÍSICO: CONTROLES, RESUMEN E HISTORIAL
// ============================================================

/** Muestra el módulo para el cliente seleccionado. */
async function renderProgress() {
    const clientId = progressClientSelect.value;
    const hasClient = Boolean(clientId);

    progressWorkspace.hidden = !hasClient;
    progressEmpty.hidden = hasClient;

    if (!hasClient) {
        progressSummary.replaceChildren();
        progressList.replaceChildren(
            createElement("p", "", "Seleccioná un cliente para ver sus controles.")
        );
        progressCount.textContent = "0 controles";
        return;
    }

    const client = await getRecord("clients", clientId);
    if (!client) {
        progressClientSelect.value = "";
        progressWorkspace.hidden = true;
        progressEmpty.hidden = false;
        progressStatus.textContent = "El cliente seleccionado ya no existe.";
        return;
    }

    const allRecords = await getAllRecords("progress");
    const records = allRecords
        .filter((record) => Number(record.clientId) === Number(clientId))
        .sort((a, b) => {
            const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
            return dateCompare || Number(b.id) - Number(a.id);
        });

    renderProgressSummary(records);
    renderProgressHistory(records);
}

/** Calcula el primer y último peso registrado y su diferencia. */
function renderProgressSummary(records) {
    progressSummary.replaceChildren();

    if (!records.length) {
        progressSummary.append(
            createElement("p", "", "Todavía no hay controles para este cliente. Registrá el primero arriba.")
        );
        return;
    }

    const chronological = [...records].sort((a, b) => {
        const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
        return dateCompare || Number(a.id) - Number(b.id);
    });
    const first = chronological[0];
    const latest = chronological[chronological.length - 1];
    const difference = Number(latest.weight) - Number(first.weight);
    const differenceText = `${difference > 0 ? "+" : ""}${difference.toLocaleString("es-AR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })} kg`;

    const cards = [
        ["Primer peso", `${formatWeight(first.weight)} kg`, formatDate(first.date)],
        ["Último peso", `${formatWeight(latest.weight)} kg`, formatDate(latest.date)],
        ["Cambio total", differenceText, difference < 0 ? "Descenso de peso" : difference > 0 ? "Aumento de peso" : "Sin variación"]
    ];

    for (const [label, value, detail] of cards) {
        const card = createElement("div", "progress-summary-card");
        card.append(
            createElement("span", "", label),
            createElement("strong", "", value),
            createElement("p", "", detail)
        );
        progressSummary.append(card);
    }
}

/** Dibuja el historial sin insertar texto del usuario como HTML. */
function renderProgressHistory(records) {
    progressList.replaceChildren();
    progressCount.textContent = `${records.length} ${records.length === 1 ? "control" : "controles"}`;

    if (!records.length) {
        progressList.append(createElement("p", "", "Todavía no hay controles registrados."));
        return;
    }

    for (const record of records) {
        const card = createElement("article", "progress-record");
        const header = createElement("div", "progress-record-header");
        const date = createElement("strong", "", formatDate(record.date));
        const removeButton = createElement("button", "secondary-button", "Eliminar");
        removeButton.type = "button";
        removeButton.setAttribute("aria-label", `Eliminar control del ${formatDate(record.date)}`);
        removeButton.addEventListener("click", async () => {
            const confirmed = window.confirm(`¿Eliminar el control del ${formatDate(record.date)} (${formatWeight(record.weight)} kg)?`);
            if (!confirmed) return;
            try {
                await deleteRecord("progress", record.id);
                await renderProgress();
                await updateRecentActivity(`Se eliminó un control de seguimiento del ${formatDate(record.date)}.`);
                showToast("Control eliminado.");
            } catch (error) {
                showDatabaseError(error);
            }
        });
        header.append(date, removeButton);
        card.append(header, createElement("div", "progress-weight", `${formatWeight(record.weight)} kg`));
        if (record.notes) {
            card.append(createElement("p", "progress-notes", record.notes));
        }
        progressList.append(card);
    }
}

function formatWeight(value) {
    return Number(value).toLocaleString("es-AR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

/** Guarda un control vinculado al cliente seleccionado. */
async function handleProgressSubmit(event) {
    event.preventDefault();

    const clientId = Number(progressClientSelect.value);
    const date = progressDateInput.value;
    const weight = Number(progressWeightInput.value);
    const notes = progressNotesInput.value.trim();

    if (!clientId) {
        progressStatus.textContent = "Seleccioná un cliente antes de guardar.";
        return;
    }
    if (!date || !Number.isFinite(weight) || weight <= 0 || weight > 500) {
        progressStatus.textContent = "Ingresá una fecha y un peso válido entre 0,1 y 500 kg.";
        return;
    }

    try {
        const client = await getRecord("clients", clientId);
        if (!client) {
            progressStatus.textContent = "El cliente seleccionado ya no existe. Actualizá la selección.";
            await populateClientSelects();
            await renderProgress();
            return;
        }

        const record = {
            clientId,
            date,
            weight: Math.round(weight * 10) / 10,
            notes,
            createdAt: new Date().toISOString()
        };

        await saveRecord("progress", record);
        progressStatus.textContent = "Control guardado correctamente.";
        progressNotesInput.value = "";
        progressWeightInput.value = "";
        progressDateInput.value = getTodayDate();
        await renderProgress();
        await updateRecentActivity(`Se registró un control de peso para ${client.name}.`);
        showToast("Control de seguimiento guardado.");
    } catch (error) {
        console.error("No se pudo guardar el control:", error);
        progressStatus.textContent = "No se pudo guardar el control. Revisá la consola.";
        showDatabaseError(error);
    }
}


//* ==========================================================*

//* 8. RUTINAS: CREAR Y ASIGNAR*

//* ==========================================================*



async function handleRoutineSubmit(event) {

    event.preventDefault();



    const clientId = Number(routineClientSelect.value);

    const name = routineNameInput.value.trim();

    const days = routineDaysInput.value.trim();

    const exercises = routineExercisesInput.value.trim();



    if (!clientId) {

        showToast("Seleccioná un cliente para asignar la rutina.");

        routineClientSelect.focus();

        return;

    }



    if (!name || !exercises) {

        showToast("Completá el nombre y los ejercicios de la rutina.");

        return;

    }



    try {

        //* Comprobamos que el cliente todavía exista.*

        const client = await getRecord("clients", clientId);



        if (!client) {

            showToast("Ese cliente ya no existe. Actualizá el selector.");

            await populateClientSelects();

            return;

        }



        const now = new Date().toISOString();



        const routine = {

            clientId,

            name,

            days,

            exercises,

            createdAt: now,

            updatedAt: now

        };



        await saveRecord("routines", routine);



        routineForm.reset();



        await populateClientSelects();

        await renderRoutines();

        await updateDashboard();

        await updateRecentActivity(`Se asignó la rutina "${name}" a ${client.name}.`);



        showToast(`Rutina asignada a ${client.name}.`);

    } catch (error) {

        showDatabaseError(error);

    }

}





//* ==========================================================*

//* 9. RUTINAS: MOSTRAR Y ELIMINAR*

//* ==========================================================*



async function renderRoutines() {

    const [routines, clients] = await Promise.all([

        getAllRecords("routines"),

        getAllRecords("clients")

    ]);



    routineList.replaceChildren();



    if (routines.length === 0) {

        routineList.append(

            createElement("p", "", "Todavía no hay rutinas registradas.")

        );

        return;

    }



    const clientsById = new Map(

        clients.map((client) => [Number(client.id), client])

    );



    routines.sort((a, b) => {

        return (b.createdAt || "").localeCompare(a.createdAt || "");

    });



    for (const routine of routines) {

        const card = createElement("article", "module-record");

        const client = clientsById.get(Number(routine.clientId));



        card.append(

            createElement("h4", "", routine.name || "Rutina sin nombre"),

            createElement(

                "p",

                "client-tag",

                `Cliente: ${client ? client.name : "Cliente no disponible"}`

            )

        );



        if (routine.days) {

            card.append(createElement("p", "", `Días: ${routine.days}`));

        }



        card.append(

            createElement("p", "record-details", routine.exercises || "")

        );



        const actions = createElement("div", "record-actions");

        const deleteButton = createElement("button", "danger-button", "Eliminar rutina");

        deleteButton.type = "button";



        deleteButton.addEventListener("click", async () => {

            const confirmed = window.confirm(

                `¿Eliminar la rutina "${routine.name}"?`

            );



            if (!confirmed) return;



            try {

                await deleteRecord("routines", routine.id);

                await renderRoutines();

                await updateDashboard();

                showToast("Rutina eliminada.");

            } catch (error) {

                showDatabaseError(error);

            }

        });



        actions.append(deleteButton);

        card.append(actions);

        routineList.append(card);

    }

}





//* ==========================================================*

//* 10. PAGOS: REGISTRAR UN PAGO*

//* ==========================================================*



async function handlePaymentSubmit(event) {

    event.preventDefault();



    const clientId = Number(paymentClientSelect.value);

    const period = paymentPeriodInput.value.trim();

    const amount = Number(paymentAmountInput.value);

    const dueDate = paymentDueDateInput.value;

    const status = paymentStatusInput.value;



    if (!clientId) {

        showToast("Seleccioná un cliente para registrar el pago.");

        paymentClientSelect.focus();

        return;

    }



    if (!period) {

        showToast("Indicá el período o concepto del pago.");

        paymentPeriodInput.focus();

        return;

    }



    if (!Number.isFinite(amount) || amount <= 0) {

        showToast("Ingresá un importe mayor que cero.");

        paymentAmountInput.focus();

        return;

    }



    if (!["pendiente", "abonado"].includes(status)) {

        showToast("Seleccioná un estado de pago válido.");

        return;

    }



    try {

        const client = await getRecord("clients", clientId);



        if (!client) {

            showToast("Ese cliente ya no existe. Actualizá el selector.");

            await populateClientSelects();

            return;

        }



        const now = new Date().toISOString();



        const payment = {

            clientId,

            period,

            amount,

            dueDate,

            status,

            createdAt: now,

            updatedAt: now,

            paidAt: status === "abonado" ? now : null

        };



        await saveRecord("payments", payment);



        paymentForm.reset();



        //* Dejamos el estado inicial en pendiente para el próximo pago.*

        paymentStatusInput.value = "pendiente";



        await populateClientSelects();

        await renderPayments();

        await updateDashboard();

        await updateRecentActivity(

            `Se registró un pago para ${client.name}: ${period}.`

        );



        showToast(`Pago registrado para ${client.name}.`);

    } catch (error) {

        showDatabaseError(error);

    }

}





//* ==========================================================*

//* 11. PAGOS: MOSTRAR HISTORIAL*

//* ==========================================================*



async function renderPayments() {

    const [payments, clients] = await Promise.all([

        getAllRecords("payments"),

        getAllRecords("clients")

    ]);



    paymentList.replaceChildren();



    if (payments.length === 0) {

        paymentList.append(

            createElement("p", "", "Todavía no hay pagos registrados.")

        );

        return;

    }



    const clientsById = new Map(

        clients.map((client) => [Number(client.id), client])

    );



    payments.sort((a, b) => {

        return (b.createdAt || "").localeCompare(a.createdAt || "");

    });



    for (const payment of payments) {

        const card = createElement("article", "module-record");

        const client = clientsById.get(Number(payment.clientId));



        card.append(

            createElement("h4", "", payment.period || "Pago sin concepto"),

            createElement(

                "p",

                "client-tag",

                `Cliente: ${client ? client.name : "Cliente no disponible"}`

            ),

            createElement("p", "", `Importe: ${formatMoney(payment.amount)}`)

        );



        if (payment.dueDate) {

            card.append(

                createElement("p", "", `Vencimiento: ${formatDate(payment.dueDate)}`)

            );

        }



        const isPaid = payment.status === "abonado";

        const status = createElement(

            "span",

            `payment-status ${isPaid ? "paid" : "pending"}`,

            isPaid ? "ABONADO" : "PENDIENTE"

        );



        const statusLine = createElement("p");

        statusLine.append("Estado: ", status);

        card.append(statusLine);



        if (payment.paidAt && isPaid) {

            card.append(

                createElement(

                    "p",

                    "",

                    `Registrado como abonado: ${new Date(payment.paidAt).toLocaleDateString("es-AR")}`

                )

            );

        }



        const actions = createElement("div", "record-actions");



        const toggleButton = createElement(

            "button",

            "secondary-button",

            isPaid ? "Marcar pendiente" : "Marcar abonado"

        );



        toggleButton.type = "button";

        toggleButton.addEventListener("click", async () => {

            try {

                const updatedPayment = {

                    ...payment,

                    status: isPaid ? "pendiente" : "abonado",

                    updatedAt: new Date().toISOString(),

                    paidAt: isPaid ? null : new Date().toISOString()

                };



                await saveRecord("payments", updatedPayment);

                await renderPayments();

                await updateDashboard();



                showToast(

                    isPaid

                        ? "El pago volvió a quedar pendiente."

                        : "Pago marcado como abonado."

                );

            } catch (error) {

                showDatabaseError(error);

            }

        });



        const deleteButton = createElement("button", "danger-button", "Eliminar pago");

        deleteButton.type = "button";

        deleteButton.addEventListener("click", async () => {

            const confirmed = window.confirm(

                `¿Eliminar el pago "${payment.period}"?`

            );



            if (!confirmed) return;



            try {

                await deleteRecord("payments", payment.id);

                await renderPayments();

                await updateDashboard();

                showToast("Pago eliminado.");

            } catch (error) {

                showDatabaseError(error);

            }

        });



        actions.append(toggleButton, deleteButton);

        card.append(actions);

        paymentList.append(card);

    }

}



/** Referencias del módulo Seguimiento **/

const progressClientSelect = document.getElementById("progress-client");

const progressForm = document.getElementById("progress-form");

const progressWorkspace = document.getElementById("progress-workspace");

const progressEmpty = document.getElementById("progress-empty");

const progressDateInput = document.getElementById("progress-date");

const progressWeightInput = document.getElementById("progress-weight");

const progressNotesInput = document.getElementById("progress-notes");

const progressStatus = document.getElementById("progress-status");

const progressList = document.getElementById("progress-list");

const progressSummary = document.getElementById("progress-summary");

const progressCount = document.getElementById("progress-count");







//* ==========================================================*

//* 12. RESUMEN Y ACTIVIDAD RECIENTE*

//* ==========================================================*



async function updateDashboard() {

    const [clients, routines, payments] = await Promise.all([

        getAllRecords("clients"),

        getAllRecords("routines"),

        getAllRecords("payments")

    ]);



    statClients.textContent = clients.length;

    statRoutines.textContent = routines.length;



    const pendingPayments = payments.filter((payment) => {

        return payment.status === "pendiente";

    });



    statPending.textContent = pendingPayments.length;

}



async function updateRecentActivity(message) {

    recentActivity.replaceChildren();



    recentActivity.append(

        createElement("div", "empty-icon", "✓"),

        createElement("h4", "", "Última actividad"),

        createElement("p", "", message)

    );

}





//* ==========================================================*

//* 13. EXPORTAR COPIA DE SEGURIDAD*

//* ==========================================================*



async function exportBackup() {

    try {

        showBackupStatus("Preparando la copia de seguridad...");



        const backup = {

            application: "G-Trainer",

            formatVersion: 1,

            exportedAt: new Date().toISOString(),

            data: {}

        };



        for (const storeName of STORE_NAMES) {

            backup.data[storeName] = await getAllRecords(storeName);

        }



        const file = new Blob(

            [JSON.stringify(backup, null, 2)],

            { type: "application/json;charset=utf-8" }

        );



        const downloadUrl = URL.createObjectURL(file);

        const link = document.createElement("a");



        link.href = downloadUrl;

        link.download = `${BACKUP_PREFIX}-${getTodayDate()}.json`;



        document.body.append(link);

        link.click();

        link.remove();



        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);



        showBackupStatus(

            "Se solicitó la descarga. Comprobá que el archivo se haya guardado."

        );



        showToast("Copia de seguridad preparada.");

    } catch (error) {

        console.error("Error al exportar el respaldo:", error);

        showBackupStatus("No se pudo generar la copia de seguridad.");

    }

}





//* ==========================================================*

//* 14. VALIDAR Y RESTAURAR UNA COPIA*

//* ==========================================================*



function validateBackup(backup) {

    if (!backup || typeof backup !== "object") {

        throw new Error("El archivo no contiene un objeto válido.");

    }



    if (backup.application !== "G-Trainer") {

        throw new Error("El archivo no corresponde a G-Trainer.");

    }



    if (backup.formatVersion !== 1) {

        throw new Error("La versión del respaldo no es compatible.");

    }



    if (!backup.data || typeof backup.data !== "object") {

        throw new Error("El archivo no contiene los datos esperados.");

    }



    // Los respaldos previos al módulo Seguimiento pueden no incluir "progress".
    if (backup.data.progress === undefined) backup.data.progress = [];

    for (const storeName of STORE_NAMES) {

        if (!Array.isArray(backup.data[storeName])) {

            throw new Error(`Falta una lista válida para "${storeName}".`);

        }



        for (const record of backup.data[storeName]) {

            if (

                !record ||

                typeof record !== "object" ||

                !Number.isSafeInteger(record.id) ||

                record.id < 1

            ) {

                throw new Error(`Hay un registro inválido en "${storeName}".`);

            }

        }

    }



    return true;

}



async function importBackup(file) {

    if (!file) return;



    try {

        showBackupStatus("Leyendo el archivo de respaldo...");



        const fileText = await file.text();

        let backup;



        try {

            backup = JSON.parse(fileText);

        } catch {

            throw new Error("El archivo no contiene un JSON válido.");

        }



        validateBackup(backup);



        const confirmed = window.confirm(

            "Vas a restaurar una copia de G-Trainer.\n\n" +

            `Clientes incluidos: ${backup.data.clients.length}\n` +

            `Rutinas incluidas: ${backup.data.routines.length}\n` +

            `Controles de seguimiento incluidos: ${backup.data.progress.length}\n` +

            `Pagos incluidos: ${backup.data.payments.length}\n\n` +

            "Los datos locales actuales serán reemplazados. ¿Continuar?"

        );



        if (!confirmed) {

            showBackupStatus("Restauración cancelada.");

            return;

        }



        await new Promise((resolve, reject) => {

            const transaction = db.transaction(STORE_NAMES, "readwrite");



            transaction.oncomplete = () => resolve(true);

            transaction.onerror = () => {

                reject(transaction.error || new Error("Falló la restauración."));

            };

            transaction.onabort = () => {

                reject(transaction.error || new Error("La restauración se canceló."));

            };



            for (const storeName of STORE_NAMES) {

                const store = transaction.objectStore(storeName);

                store.clear();



                for (const record of backup.data[storeName]) {

                    store.put(record);

                }

            }

        });



        await renderClients();

        await populateClientSelects();

        await renderRoutines();

        await renderPayments();

        await renderProgress();

        await updateDashboard();



        showBackupStatus("Restauración completada. Revisá los datos.");

        showToast("Copia restaurada correctamente.");

    } catch (error) {

        console.error("Error al restaurar:", error);

        showBackupStatus(error.message || "No se pudo restaurar la copia.");

        showToast("No se pudo restaurar el respaldo.");

    } finally {

        backupFileInput.value = "";

    }

}





//* ==========================================================*

//* 15. CONECTAR LOS FORMULARIOS Y BOTONES*

//* ==========================================================*



function setupEventListeners() {

    newClientButton.addEventListener("click", openNewClientDialog);

    if (newClientListButton) {
        newClientListButton.addEventListener("click", openNewClientDialog);
    }



    clientForm.addEventListener("submit", handleClientFormSubmit);



    closeDialogButton.addEventListener("click", () => {

        clientDialog.close();

    });



    cancelClientButton.addEventListener("click", () => {

        clientDialog.close();

    });



    clientSearch.addEventListener("input", () => {

        renderClients().catch(showDatabaseError);

    });



    //* Estos dos formularios se conectan con sus funciones de guardado.*

    routineForm.addEventListener("submit", handleRoutineSubmit);

    paymentForm.addEventListener("submit", handlePaymentSubmit);

    progressForm.addEventListener("submit", handleProgressSubmit);
    progressClientSelect.addEventListener("change", () => {
        progressStatus.textContent = "";
        renderProgress().catch(showDatabaseError);
    });



    exportButton.addEventListener("click", exportBackup);



    backupFileInput.addEventListener("change", async () => {

        const file = backupFileInput.files[0];



        if (file) {

            await importBackup(file);

        }

    });

}





//* ==========================================================*

//* 16. INICIAR LA APLICACIÓN*

//* ==========================================================*



async function initializeApp() {

    try {

        await openDatabase();



        setupNavigation();

        setupEventListeners();



        await renderClients();

        await populateClientSelects();

        await renderRoutines();

        await renderPayments();

        progressDateInput.value = getTodayDate();
        await renderProgress();

        await updateDashboard();



        console.log("G-Trainer se inició correctamente.");

    } catch (error) {

        console.error("No se pudo iniciar G-Trainer:", error);



        alert(

            "No se pudo iniciar G-Trainer.\n\n" +

            "Revisá la consola del navegador para conocer el error."

        );

    }

}



initializeApp();
