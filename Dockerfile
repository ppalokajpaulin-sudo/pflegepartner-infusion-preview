# ACHTUNG: Dieses Repo ist eine statische Site und wird auf VERCEL deployt (vercel.json).
#
# Der Railway-Service "pflegepartner-leads" (Express-API + Dashboard) ist im Railway-Dashboard
# noch mit DIESEM GitHub-Repo verbunden. Ein erfolgreicher Build hier wuerde dort das Leads-API
# durch einen statischen Server ersetzen (so passiert am 20.08.2026). Darum bricht dieser Build
# absichtlich ab, damit Railway die laufende Leads-API nicht anfasst.
#
# Dauerhafte Loesung: Railway -> Projekt pflegepartner-leads -> Service -> Settings -> Source
# -> "Disconnect" (Repo trennen). Das Leads-Backend wird per `railway up` aus
# ~/Documents/claude code /pflegepartner-leads deployt.
FROM alpine:3.20
RUN echo "STOP: pflegepartner-infusion-preview ist eine Vercel-Site und darf nicht auf Railway gebaut werden. Repo im Railway-Service pflegepartner-leads trennen." && exit 1
