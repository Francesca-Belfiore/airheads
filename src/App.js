import React, { useState, useEffect } from "react";

import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  useMediaQuery,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import { Info } from "@mui/icons-material";

import {
  fetchExchangeRates,
  fetchHotelsByCity,
  findDestination,
  getCheapestFlight,
  handleSearchFlights,
  isUpdateNeeded,
  researchHotel,
} from "./utils";

import {
  Images,
  Logo,
  FlightCard,
  HotelCard,
  EmptyState,
  Research,
} from "./components";

function App() {
  // stati relativi all'applicazione
  const [loading, setLoading] = useState(false);

  // stati relativi alla ricerca dell'aeroporto di partenza e di destinazione
  const [departureAirport, setDepartureAirport] = useState("");
  const [destination, setDestination] = useState("");
  const [search, setSearch] = useState("");

  // stati relativi ai viaggi di andata e ritorno e hotel
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [outboundFlight, setOutboundFlight] = useState(null);
  const [inboundFlight, setInboundFlight] = useState(null);
  const [hotel, setHotel] = useState();

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  // richiama i dati dei tassi di cambio da localStorage, se presenti
  const exchangeRates = localStorage.getItem("exchangeRates");

  // imposta e aggiorna i tassi di cambio se necessario
  const updateExchangeRates = async () => {
    if (isUpdateNeeded(exchangeRates, 24)) {
      const data = await fetchExchangeRates("EUR");
      localStorage.setItem("exchangeRates", JSON.stringify(data));
    }
  };

  useEffect(() => {
    // chiama la funzione all'avvio dell'applicazione
    updateExchangeRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** funzione che gestisce la ricerca della destinazione e dei voli di andata e ritorno al submit dei dati richiesti all'utente */
  const handleSearch = async () => {
    setLoading(true);

    try {
      // Attende il completamento di findDestination prima di procedere
      const destination = await findDestination(search);
  
      // Lancia un errore se la destinazione non è definita
      if (!destination) {
        throw new Error("Destinazione non definita");
      }

      // Ricerca dei voli di partenza utilizzando i dati di destination
      const departureFlightData = await handleSearchFlights(
        search,
        destination.iataCode,
        departureDate
      );

      // Ricerca dei voli di ritorno utilizzando i dati di destination
      const returnFlightData = await handleSearchFlights(
        destination.iataCode,
        search,
        returnDate
      );

      // Trova il volo di partenza più economico
      const departureFlight = getCheapestFlight(
        departureFlightData.content.results.itineraries,
        "departure"
      );

      // Trova il volo di ritorno più economico
      const returnFlight = getCheapestFlight(
        returnFlightData.content.results.itineraries,
        "return"
      );

      // Trova gli hotel nell'area indicata
      const hotelList = await fetchHotelsByCity(destination.iataCode);

      // Limitiamo il numero di risultati per non appensatire troppo la richiesta
      const hotelIds = hotelList.data
        .map((hotel) => hotel.hotelId)
        .slice(0, 20);

      // Ricerca hotel corrispondendi agli Id passati
      const foundHotels = await researchHotel(
        JSON.stringify(hotelIds),
        departureDate,
        returnDate
      );

      // Ordina gli hotel per prezzo crescente e restituisce il più economico
      const cheapestHotel = foundHotels.data.sort((a, b) => {
        const priceA = parseFloat(a.offers[0].price.total);
        const priceB = parseFloat(b.offers[0].price.total);
        return priceA - priceB;
      })[0];

      if (!departureFlight || !returnFlight || !hotelList) {
        // se non trova dei voli diretti o degli hotel disponibili per le date selezionate, riprova con un'altra destinazione"
        handleSearch();
      } else {
        // setta i dati sulla destinazione, i voli e l'hotel da mostrare all'utente
        setDestination(destination);
        setOutboundFlight(departureFlight);
        setInboundFlight(returnFlight);
        setHotel(cheapestHotel);
        // disabilita lo stato di caricamento
        setLoading(false);
      }
    } catch (error) {
      // ripete la ricerca se si verifica un errore
      handleSearch();//
    } finally {
      setDepartureAirport(search);
    }
  };

  return (
    <Container>
      <Logo />

      <Research
        departureDate={departureDate}
        returnDate={returnDate}
        loading={loading}
        setDepartureDate={setDepartureDate}
        setReturnDate={setReturnDate}
        handleSearch={handleSearch}
        setSearch={setSearch}
        search={search}
      />

      {!destination && <EmptyState loading={loading} />}

      {destination && (
        <Card
          style={{
            marginBottom: "20px",
            padding: "20px",
            borderRadius: "20px",
            opacity: loading ? 0.5 : 1,
            pointerEvents: loading ? "none" : "auto",
          }}
        >
          <CardContent
            style={{
              paddingLeft: isSmallScreen ? 0 : 20,
              paddingRight: isSmallScreen ? 0 : 20,
              paddingBottom: isSmallScreen ? 0 : 20,
            }}
          >
            <Box
              style={{
                display: "flex",
                flexDirection: isSmallScreen ? "column" : "row",
                alignContent: "center",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h5">
                {destination.cityName ||destination.name } ({destination.countryName})
              </Typography>
            </Box>
          </CardContent>

          <Box
            style={{
              display: "flex",
              flexDirection: isSmallScreen ? "column" : "row",
            }}
          >
            <CardContent
              style={{
                flex: 1,
                paddingLeft: isSmallScreen ? 0 : 20,
                paddingRight: isSmallScreen ? 0 : 20,
              }}
            >
              <Images destination={destination.cityName || destination.name} />

              <br></br>

              {!isSmallScreen && !!hotel && (
                <HotelCard
                  checkin={departureDate}
                  checkout={returnDate}
                  hotel={hotel}
                  exchangeRates={JSON.parse(exchangeRates)}
                />
              )}
            </CardContent>

            <CardContent
              style={{
                flex: 1,
                paddingLeft: isSmallScreen ? 0 : 20,
                paddingRight: isSmallScreen ? 0 : 20,
              }}
            >
              {!!outboundFlight && (
                <FlightCard
                  departureAirport={departureAirport}
                  destinationAirport={destination.iataCode}
                  flight={outboundFlight}
                  type="outbound"
                />
              )}
              <br></br>
              {!!inboundFlight && (
                <FlightCard
                  departureAirport={destination.iataCode}
                  destinationAirport={departureAirport}
                  flight={inboundFlight}
                  type="inbound"
                />
              )}

              {isSmallScreen && !!hotel && (
                <>
                  <br></br>
                  <HotelCard
                    checkin={departureDate}
                    checkout={returnDate}
                    hotel={hotel}
                    exchangeRates={JSON.parse(exchangeRates)}
                  />
                </>
              )}

              <CardContent
                style={{
                  marginTop: !isSmallScreen ? 20 : undefined,
                  paddingBottom: 0,
                }}
              >
                <Typography variant="h6" align="right">
                  Totale stimato:{" "}
                  {(
                    parseFloat(
                      outboundFlight?.pricingOptions[0]?.price?.amount / 1000
                    ) +
                    parseFloat(
                      inboundFlight?.pricingOptions[0]?.price?.amount / 1000
                    ) +
                    parseFloat(
                      hotel?.offers[0]?.price?.total /
                      JSON.parse(exchangeRates)[hotel?.offers[0]?.price?.currency]
                    )
                  ).toLocaleString("it-IT", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </Typography>

                <br></br>

                <Box
                  style={{
                    display: "flex",
                    alignItems: "center",
                    opacity: 0.5,
                  }}
                >
                  <Info style={{ color: "grey", marginRight: 8 }} />
                  <Typography variant="body2" color="grey" align="left">
                    Tutti i prezzi sono indicativi, si prega di controllare sui
                    rispettivi siti le offerte e le disponibilità effettive per
                    le date selezionate
                  </Typography>
                </Box>
              </CardContent>
            </CardContent>
          </Box>
        </Card>
      )}
    </Container>
  );
}

export default App;