package com.example.accidentpoc

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import java.security.SecureRandom
import java.time.Instant
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

internal data class StoredVehicle(
    val origin: String,
    val creationId: String,
    val creationSecret: String,
    val access: CaseAccess? = null,
    val pair: PairLink? = null,
    val pending: List<PendingMutation> = emptyList(),
    val factFingerprints: Map<String, String> = emptyMap(),
    val pendingApproval: PairClaim? = null,
) {
    companion object {
        fun new(origin: String): StoredVehicle {
            val secret = ByteArray(32).also { SecureRandom().nextBytes(it) }
            return StoredVehicle(origin, UUID.randomUUID().toString(), Base64.encodeToString(secret, Base64.NO_WRAP or Base64.URL_SAFE or Base64.NO_PADDING))
        }
    }
}

internal class SecureVehicleStore(context: Context, name: String) {
    private val file = AtomicFile(File(context.noBackupFilesDir, "$name.enc"))
    private val alias = "${context.packageName}.$name.v1"
    private val aad = alias.toByteArray(Charsets.UTF_8)
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    fun read(): StoredVehicle? {
        if (!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists()) return null
        val encrypted = JSONObject(file.openRead().use { it.readBytes().toString(Charsets.UTF_8) })
        require(encrypted.getInt("version") == 1)
        val key = keyStore.getKey(alias, null) as? SecretKey
            ?: throw IllegalStateException("Saved vehicle key is unavailable")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, Base64.decode(encrypted.string("iv"), Base64.NO_WRAP)))
        cipher.updateAAD(aad)
        val plain = cipher.doFinal(Base64.decode(encrypted.string("ciphertext"), Base64.NO_WRAP))
        return try { decode(JSONObject(plain.toString(Charsets.UTF_8))) } finally { plain.fill(0) }
    }

    fun write(value: StoredVehicle) {
        val key = (keyStore.getKey(alias, null) as? SecretKey) ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256).setRandomizedEncryptionRequired(true).build())
            generateKey()
        }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        cipher.updateAAD(aad)
        val plain = encode(value).toString().toByteArray(Charsets.UTF_8)
        val ciphertext = try { cipher.doFinal(plain) } finally { plain.fill(0) }
        val envelope = JSONObject().put("version", 1)
            .put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .put("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP)).toString().toByteArray(Charsets.UTF_8)
        val stream = file.startWrite()
        try {
            stream.write(envelope)
            file.finishWrite(stream)
        } catch (error: Exception) {
            file.failWrite(stream)
            throw error
        }
    }

    fun delete() = file.delete()

    private fun encode(value: StoredVehicle) = JSONObject().put("version", 1)
        .put("origin", value.origin).put("creationId", value.creationId).put("creationSecret", value.creationSecret)
        .put("access", value.access?.let {
            JSONObject().put("caseId", it.caseId).put("credential", it.credential).put("expiresAt", it.expiresAt.toString())
        } ?: JSONObject.NULL)
        .put("pair", value.pair?.json() ?: JSONObject.NULL)
        .put("pendingApproval", value.pendingApproval?.json() ?: JSONObject.NULL)
        .put("fingerprints", JSONObject(value.factFingerprints))
        .put("pending", JSONArray().apply {
            value.pending.forEach { mutation -> put(mutation.body()) }
        })

    private fun decode(value: JSONObject): StoredVehicle {
        require(value.getInt("version") == 1)
        val access = if (value.isNull("access")) null else value.getJSONObject("access").let {
            CaseAccess(it.string("caseId"), it.string("credential"), Instant.parse(it.string("expiresAt")))
        }
        val pair = if (value.isNull("pair")) null else PairLink.parse(value.getJSONObject("pair"))
        val approval = if (value.isNull("pendingApproval")) null else PairClaim.parse(value.getJSONObject("pendingApproval"))
        val pending = value.getJSONArray("pending").objects().map {
            PendingMutation(it.string("mutationId"), it.nonnegativeLong("expectedRevision"), SdkFact.parse(it.getJSONObject("fact")))
        }
        val fingerprints = value.getJSONObject("fingerprints").let { all -> all.keys().asSequence().associateWith { all.string(it) } }
        return StoredVehicle(value.string("origin"), value.string("creationId"), value.string("creationSecret"),
            access, pair, pending, fingerprints, approval)
    }
}
