plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "com.example.accidentpoc"
    compileSdk = 35
    defaultConfig { applicationId = "com.example.accidentpoc"; minSdk = 28; targetSdk = 35; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" }
    // Storyboard fixture 의 정본을 그대로 읽는다.
    sourceSets["main"].assets.srcDir("../../../specs/emergency-experience")
    buildFeatures { compose = true }
}
dependencies {
    // BOM 으로 app 과 test 의 Compose version 을 맞춘다 (ui·foundation 1.9.4, material3 1.4.0).
    val compose = platform("androidx.compose:compose-bom:2025.10.01")
    implementation(compose)
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.material3:material3")
    androidTestImplementation(compose)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
