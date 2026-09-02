# soccasemanagement4

## Opdracht omschrijving

Een Security Operations Centre (SOC) bewaakt systemen van organisaties op signalen van aanvallen en
reageert wanneer er iets verdachts wordt gevonden. Een Managed Security Service Provider (MSSP) biedt zo’n
SOC als dienst aan meerdere klantorganisaties tegelijk. Daardoor kunnen bijvoorbeeld verschillende
organisaties vanuit één SOC worden gemonitord door dezelfde analisten en binnen hetzelfde 24/7-rooster.
Het werk van het SOC komt binnen als alerts vanuit de securitytooling van klanten. Veel alerts blijken ruis te
zijn. De overgebleven alerts moeten worden beoordeeld, onderzocht en waar nodig opgevolgd. Daarbij gaat
het onder andere om triage, onderzoek, het opvragen van logs, het controleren van verdachte IP-adressen,
filehashes of domeinen, het correleren van eerdere alerts en het ondersteunen van containment samen met
de klant.<br><br>
De opdrachtgever gebruikt nu een IT-helpdeskticketsysteem van het moederbedrijf. Dat systeem is ontworpen
voor reguliere IT-meldingen, maar past slecht bij incident response. Het kent geen observables, geen goede
manier om meerdere alerts aan dezelfde inbraak te koppelen, geen duidelijke plek voor bewijsmateriaal, geen
herbruikbare playbooks, geen tenancy-model en geen bruikbare API. Daardoor vindt het echte onderzoek nu
plaats in spreadsheets en mondelinge overdrachten, terwijl achteraf alleen een samenvatting in het ticket
wordt gezet.<br><br>

De opdrachtgever wil daarom een werkend platform voor incident-casemanagement laten ontwikkelen. Het
systeem moet geen gewoon ticketsysteem met securitytermen worden, maar een applicatie die aansluit op de
manier waarop incident response in een SOC werkt. Het platform moet alerts uit externe bronnen kunnen
ingesten, deze kunnen laten triageren, relevante alerts kunnen promoveren tot onderzoeken en vastleggen
wat er is gevonden en gedaan. Die informatie moet gestructureerd genoeg zijn om overdracht mogelijk te
maken en later teruggevonden te kunnen worden.<br><br>
Een belangrijk uitgangspunt is dat de opdrachtgever meerdere klantorganisaties bedient. Er geldt daarom een
strikte scheiding tussen klanten: klant A mag nooit informatie van klant B kunnen zien. Ook spelen SLA’s een
rol, omdat contractueel is vastgelegd hoe snel werkzaamheden moeten worden opgepakt en afgehandeld.<br><br>
De centrale vraag van het project is:<br><br>
<b>
Hoe kan een veilig, onderhoudbaar en gestructureerd casemanagementplatform worden ontwikkeld
waarmee een MSSP SOC alerts kan verwerken, onderzoeken kan uitvoeren en incidentkennis duurzaam
kan vastleggen voor meerdere strikt gescheiden klantorganisaties?
