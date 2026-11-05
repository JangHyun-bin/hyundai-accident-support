plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "com.example.accidentpoc"
    compileSdk = 35
    defaultConfig { applicationId = "com.example.accidentpoc"; minSdk = 28; targetSdk = 35 }
    buildFeatures { compose = true }
}
dependencies {
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.material3:material3-android:1.4.0")
    implementation("androidx.compose.animation:animation-android:1.9.4")
}
