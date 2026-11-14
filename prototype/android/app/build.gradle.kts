import java.io.File
import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

fun configured(name: String): String = providers.gradleProperty(name)
    .orElse(providers.environmentVariable(name)).orNull.orEmpty()

val backendOrigin = configured("CHABUN_API_BASE_URL").trim().trimEnd('/')
if (backendOrigin.isNotEmpty()) {
    val uri = URI(backendOrigin)
    require(uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.rawUserInfo == null &&
        uri.rawQuery == null && uri.rawFragment == null && uri.rawPath.isNullOrEmpty()) {
        "CHABUN_API_BASE_URL must be an HTTPS origin without a path, query, or credentials"
    }
}
val signalEnvironment = configured("CHABUN_VEHICLE_ENVIRONMENT").trim().ifEmpty { "auto" }
require(signalEnvironment in setOf("auto", "emulator")) {
    "CHABUN_VEHICLE_ENVIRONMENT must be auto or emulator"
}
val releaseValues = listOf("STORE_FILE", "STORE_PASSWORD", "KEY_ALIAS", "KEY_PASSWORD")
    .associateWith { configured("CHABUN_RELEASE_$it") }
val hasReleaseKey = releaseValues.values.all { it.isNotEmpty() }

android {
    namespace = "com.example.accidentpoc"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.example.accidentpoc"
        minSdk = 28
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "API_BASE_URL", "\"$backendOrigin\"")
        buildConfigField("String", "VEHICLE_ENVIRONMENT", "\"$signalEnvironment\"")
    }
    // Storyboard fixture 의 정본을 그대로 읽는다.
    sourceSets["main"].assets.srcDir("../../../specs/emergency-experience")
    buildFeatures { compose = true; buildConfig = true }
    signingConfigs {
        if (hasReleaseKey) {
            create("externalRelease") {
                storeFile = file(releaseValues.getValue("STORE_FILE"))
                storePassword = releaseValues.getValue("STORE_PASSWORD")
                keyAlias = releaseValues.getValue("KEY_ALIAS")
                keyPassword = releaseValues.getValue("KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasReleaseKey) signingConfig = signingConfigs.getByName("externalRelease")
        }
    }
}

val requireReleaseInputs = tasks.register("requireReleaseInputs") {
    doLast {
        check(backendOrigin.isNotEmpty()) { "Release requires CHABUN_API_BASE_URL" }
        check(hasReleaseKey) { "Release requires all four CHABUN_RELEASE_* external keystore inputs" }
        val keyFile = file(releaseValues.getValue("STORE_FILE"))
        check(File(releaseValues.getValue("STORE_FILE")).isAbsolute && keyFile.isFile) { "Release requires an existing absolute external keystore path" }
        check(!keyFile.canonicalPath.startsWith(rootDir.canonicalPath + File.separator)) { "Release keystore must stay outside the repository" }
    }
}
tasks.matching { it.name == "preReleaseBuild" }.configureEach { dependsOn(requireReleaseInputs) }

dependencies {
    // BOM 으로 app 과 test 의 Compose version 을 맞춘다 (ui·foundation 1.9.4, material3 1.4.0).
    val compose = platform("androidx.compose:compose-bom:2025.10.01")
    implementation(compose)
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("ai.pleos.playground:Vehicle:2.3.2")
    implementation("ai.pleos.playground:vehicle-data:1.1.11")
    implementation("ai.pleos.playground:vehicle-aidl:1.1.1")
    implementation("com.google.zxing:core:3.5.3")
    androidTestImplementation(compose)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
