const API = {
    organizationList: "/orgsList",
    analytics: "/api3/analitics",
    orgReqs: "/api3/reqBase",
    buhForms: "/api3/buh",
};

async function fetchWithCheck(url) {
    try {
        const response = await fetch(url);
        console.log("Fetch response for", url, response);

        if (!response.ok) {
            alert(`Ошибка запроса ${url}: ${response.status} ${response.statusText}`);
            return null;
        }

        return await response.json();
    } catch (err) {
        alert(`Ошибка сети при реквесте ${url}`);
        return null;
    }
}

async function run() {
    const orgOgrns = await fetchWithCheck(API.organizationList);
    if (!orgOgrns) return;

    const ogrns = orgOgrns.join(",");

    const requisites = await fetchWithCheck(`${API.orgReqs}?ogrn=${ogrns}`);
    if (!requisites) return;

    const analytics = await fetchWithCheck(`${API.analytics}?ogrn=${ogrns}`);
    if (!analytics) return;

    const buh = await fetchWithCheck(`${API.buhForms}?ogrn=${ogrns}`);
    if (!buh) return;

    const orgsMap = reqsToMap(requisites);
    addInOrgsMap(orgsMap, analytics, "analytics");
    addInOrgsMap(orgsMap, buh, "buhForms");
    render(orgsMap, orgOgrns);
}

run();

function reqsToMap(requisites) {
    return requisites.reduce((acc, item) => {
        acc[item.ogrn] = item;
        return acc;
    }, {});
}

function addInOrgsMap(orgsMap, additionalInfo, key) {
    for (const item of additionalInfo) {
        if (orgsMap[item.ogrn]) {
            orgsMap[item.ogrn][key] = item[key];
        }
    }
}

function render(organizationsInfo, organizationsOrder) {
    const table = document.getElementById("organizations");
    table.classList.remove("hide");

    const template = document.getElementById("orgTemplate");
    const container = table.querySelector("tbody");

    organizationsOrder.forEach((ogrn) => {
        renderOrganization(organizationsInfo[ogrn], template, container);
    });
}

function renderOrganization(orgInfo, template, container) {
    const clone = document.importNode(template.content, true);
    const nameEl = clone.querySelector(".name");
    const indebtednessEl = clone.querySelector(".indebtedness");
    const moneyEl = clone.querySelector(".money");
    const addressEl = clone.querySelector(".address");

    nameEl.textContent =
        (orgInfo.UL && orgInfo.UL.legalName && orgInfo.UL.legalName.short) || "";

    indebtednessEl.textContent = formatMoney(orgInfo.analytics?.s1002 || 0);

    const forms = orgInfo.buhForms || [];
    const lastForm = forms[forms.length - 1];
    if (lastForm?.year === 2017) {
        moneyEl.textContent = formatMoney(
            lastForm.form2?.[0]?.endValue || 0
        );
    } else {
        moneyEl.textContent = "—";
    }

    const addr = orgInfo.UL?.legalAddress?.parsedAddressRF;
    addressEl.textContent = addr ? createAddress(addr) : "";
    container.appendChild(clone);
}

function formatMoney(money) {
    let formatted = money.toFixed(2).replace(".", ",");
    const rounded = Math.floor(money).toString();
    for (let i = rounded.length - 3; i > 0; i -= 3) {
        formatted = `${formatted.slice(0, i)} ${formatted.slice(i)}`;
    }
    return `${formatted} ₽`;
}

function createAddress(address) {
    const parts = [];
    if (address.regionName) parts.push(fmt("regionName"));
    if (address.city)       parts.push(fmt("city"));
    if (address.street)     parts.push(fmt("street"));
    if (address.house)      parts.push(fmt("house"));
    return parts.join(", ");

    function fmt(key) {
        return `${address[key].topoShortName}. ${address[key].topoValue}`;
    }
}
