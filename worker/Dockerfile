# Build a static binary, then ship it on a minimal base.
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN CGO_ENABLED=0 go build -o /reminder-worker .

FROM gcr.io/distroless/static-debian12
COPY --from=build /reminder-worker /reminder-worker
ENTRYPOINT ["/reminder-worker"]
