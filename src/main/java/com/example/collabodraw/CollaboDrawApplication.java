package com.example.collabodraw;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class CollaboDrawApplication {

    public static void main(String[] args) {
        SpringApplication.run(CollaboDrawApplication.class, args);
    }
}
