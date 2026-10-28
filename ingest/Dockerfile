FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /slidefarm-ingest .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /slidefarm-ingest /slidefarm-ingest
EXPOSE 4318
ENTRYPOINT ["/slidefarm-ingest"]
