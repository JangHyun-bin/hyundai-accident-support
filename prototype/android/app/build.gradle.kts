import java.io.File
import java.net.URI
import javax.inject.Inject

plugins {
    id("com.android.application")
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
val demoControls = configured("CHABUN_DEMO_CONTROLS").trim().ifEmpty { "true" }
require(demoControls in setOf("true", "false")) {
    "CHABUN_DEMO_CONTROLS must be true or false"
}
val releaseValues = listOf("STORE_FILE", "STORE_PASSWORD", "KEY_ALIAS", "KEY_PASSWORD")
    .associateWith { configured("CHABUN_RELEASE_$it") }
val hasReleaseKey = releaseValues.values.all { it.isNotEmpty() }

android {
    namespace = "com.example.accidentpoc"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.chabun.vehicle"
        minSdk = 28
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "API_BASE_URL", "\"$backendOrigin\"")
        buildConfigField("String", "VEHICLE_ENVIRONMENT", "\"$signalEnvironment\"")
        buildConfigField("boolean", "DEMO_CONTROLS", demoControls)
    }
    buildFeatures { buildConfig = true }
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

abstract class SyncWebAssets @Inject constructor(private val files: FileSystemOperations) : DefaultTask() {
    @get:Internal abstract val bundle: DirectoryProperty
    @get:OutputDirectory abstract val destination: DirectoryProperty

    @get:InputFiles @get:PathSensitive(PathSensitivity.RELATIVE)
    val bundleFiles: FileTree get() = bundle.asFileTree

    @TaskAction fun sync() {
        val root = bundle.get().asFile
        check(root.resolve("index.html").isFile) {
            "Web bundle missing: ${root.path}/index.html. Build it first with `npm run build:native` in prototype/web."
        }
        files.sync { from(root); into(destination.dir("web")) }
    }
}

// A generated assets directory lets every consumer (merge, lint) depend on the copy; writing into src/main/assets does not.
val syncWebAssets = tasks.register<SyncWebAssets>("syncWebAssets") {
    bundle.set(layout.projectDirectory.dir("../../web/dist-native"))
}
androidComponents {
    onVariants { variant -> variant.sources.assets?.addGeneratedSourceDirectory(syncWebAssets, SyncWebAssets::destination) }
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
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.9.4")
    implementation("androidx.webkit:webkit:1.18.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("ai.pleos.playground:Vehicle:2.3.2")
    implementation("ai.pleos.playground:vehicle-data:1.1.11")
    implementation("ai.pleos.playground:vehicle-aidl:1.1.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
}
