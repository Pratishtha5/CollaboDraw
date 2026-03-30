# Multi-stage Dockerfile for Spring Boot (Java 21)
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build

# Copy Maven wrapper and project files
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src

# Make mvnw executable and build jar
RUN chmod +x mvnw && ./mvnw -DskipTests package

# Runtime image
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy the Spring Boot executable jar (not the *.jar.original file)
COPY --from=builder /build/target/*SNAPSHOT.jar app.jar

# Allow custom JVM options
ENV JAVA_OPTS=""

# Render provides the port via $PORT
EXPOSE 8080

# Start spring boot using the Render PORT
CMD ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
