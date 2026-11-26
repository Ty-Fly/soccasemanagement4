// Eigen voorbeeldplaybooks (US-19 AC 3). De echte playbooks van de opdrachtgever zijn geheim.
export const PLAYBOOKS = {
  phishing: {
    key: 'phishing',
    name: 'Phishing',
    steps: [
      { id: 'ph1', title: 'Mail en headers veiligstellen', hint: 'Exporteer de originele mail (.eml) en voeg toe als bewijs.' },
      { id: 'ph2', title: 'Afzender en URL controleren', hint: 'Controleer domein, registratiedatum en doel van de link.' },
      { id: 'ph3', title: 'Andere ontvangers zoeken', hint: 'Zoek in de mailgateway naar dezelfde afzender of hetzelfde onderwerp.' },
      { id: 'ph4', title: 'Wachtwoord van getroffen gebruiker resetten', hint: 'Alleen als de link is aangeklikt en gegevens zijn ingevuld.' },
      { id: 'ph5', title: 'Domein en URL blokkeren', hint: 'Laat de klant de URL op proxy of firewall blokkeren.' },
      { id: 'ph6', title: 'Klant informeren over bevindingen', hint: 'Via een bericht in deze case.' },
    ],
  },
  'brute-force': {
    key: 'brute-force',
    name: 'Brute-force',
    steps: [
      { id: 'bf1', title: 'Bron-IP en doelaccounts vaststellen', hint: 'Zie het tabblad Observables.' },
      { id: 'bf2', title: 'Controleren of een login is gelukt', hint: 'Zoek in de authenticatielogs naar een succesvolle login na de pogingen.' },
      { id: 'bf3', title: 'Reputatie van het IP-adres controleren', hint: 'Let op de lopende pentests in het overdrachtsrapport.' },
      { id: 'bf4', title: 'Bron-IP laten blokkeren', hint: 'Klant blokkeert het adres op de VPN-gateway of firewall.' },
      { id: 'bf5', title: 'MFA-status van het account controleren', hint: 'Accounts zonder MFA melden aan de klant.' },
      { id: 'bf6', title: 'Klant informeren over bevindingen', hint: 'Via een bericht in deze case.' },
    ],
  },
  malware: {
    key: 'malware',
    name: 'Malware',
    steps: [
      { id: 'mw1', title: 'Endpoint isoleren', hint: 'Isoleer het systeem via de EDR-console van de klant.' },
      { id: 'mw2', title: 'Hash en proces analyseren', hint: 'Bekijk de procesboom en de herkomst van het bestand.' },
      { id: 'mw3', title: 'Andere systemen met dezelfde hash zoeken', hint: 'Zoek in de EDR naar dezelfde SHA-256.' },
      { id: 'mw4', title: 'Persistentie verwijderen', hint: 'Geplande taken, services en run-keys controleren.' },
      { id: 'mw5', title: 'Endpoint vrijgeven na herstel', hint: 'Pas na akkoord van de klant.' },
    ],
  },
  overig: {
    key: 'overig',
    name: 'Algemeen incident',
    steps: [
      { id: 'ov1', title: 'Melding en context controleren', hint: 'Lees de alert en de observables.' },
      { id: 'ov2', title: 'Bijbehorende logs opvragen', hint: 'Bij de klant of in de SIEM.' },
      { id: 'ov3', title: 'Impact inschatten', hint: 'Welke systemen en processen zijn geraakt?' },
      { id: 'ov4', title: 'Klant informeren over bevindingen', hint: 'Via een bericht in deze case.' },
    ],
  },
}
