# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.**

# Android Support
-keep class androidx.** { *; }
-dontwarn androidx.**

# Kotlin
-keepclasseswithmembernames class * {
    native <methods>;
}

# OkHttp & Retrofit
-dontwarn okhttp3.**
-dontwarn retrofit2.**

# General
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
